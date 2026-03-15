// seed_commentary_mhc.js
const { PrismaClient } = require('@prisma/client');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Mapeo de abreviaturas a bookOrder
const BOOK_MAP = {
  'Gen': { order: 1, name: 'Génesis' },
  'Ex': { order: 2, name: 'Éxodo' },
  'Exod': { order: 2, name: 'Éxodo' },
  'Lev': { order: 3, name: 'Levítico' },
  'Num': { order: 4, name: 'Números' },
  'Deut': { order: 5, name: 'Deuteronomio' },
  'Deu': { order: 5, name: 'Deuteronomio' },
  // ... agregar todos los libros
  'Mat': { order: 40, name: 'Mateo' },
  'Matt': { order: 40, name: 'Mateo' },
  'Mal': { order: 39, name: 'Malaquías' },
  'Eccl': { order: 21, name: 'Eclesiastés' },
  'Ec': { order: 21, name: 'Eclesiastés' },
  // ... completar
};

function cleanText(text) {
  if (!text) return null;
  return String(text)
    .replace(/<[^>]*>/g, ' ')  // Quitar HTML
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function parseScripRef(passage) {
  // Parsear "Ec 12:13" o "Gen 1:1-5"
  const match = passage.match(/^(\w+)\s*(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  
  const [, book, chapter, verseStart, verseEnd] = match;
  const bookInfo = BOOK_MAP[book];
  
  if (!bookInfo) {
    console.warn(`Libro no reconocido: ${book}`);
    return null;
  }
  
  return {
    bookAbbr: book,
    bookOrder: bookInfo.order,
    chapter: parseInt(chapter),
    verseStart: parseInt(verseStart),
    verseEnd: verseEnd ? parseInt(verseEnd) : parseInt(verseStart),
  };
}

function extractCommentaryEntries(div, sourceId, bookAbbr, bookOrder) {
  const entries = [];
  
  // Procesar párrafos con scripRef
  const paragraphs = div.p || [];
  const pArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  
  for (const p of pArray) {
    if (!p) continue;
    
    const id = p['@_id'];
    let content = '';
    let scripRefs = [];
    
    // Extraer texto y referencias
    if (typeof p === 'string') {
      content = p;
    } else if (p['#text']) {
      content = p['#text'];
    }
    
    // Buscar scripRef dentro del párrafo
    if (p.scripRef) {
      const refs = Array.isArray(p.scripRef) ? p.scripRef : [p.scripRef];
      for (const ref of refs) {
        const passage = ref['@_passage'];
        if (passage) {
          const parsed = parseScripRef(passage);
          if (parsed) scripRefs.push(parsed);
        }
      }
    }
    
    // Si hay contenido sustancial, crear entrada
    const cleanContent = cleanText(content);
    if (cleanContent && cleanContent.length > 50) {
      
      // Usar la primera referencia o el contexto del div
      const mainRef = scripRefs[0] || { 
        bookAbbr, 
        bookOrder, 
        chapter: 1, 
        verseStart: null, 
        verseEnd: null 
      };
      
      entries.push({
        sourceId,
        bookAbbr: mainRef.bookAbbr,
        bookOrder: mainRef.bookOrder,
        chapter: mainRef.chapter,
        verseStart: mainRef.verseStart,
        verseEnd: mainRef.verseEnd,
        content: cleanContent,
        contentHtml: typeof p === 'string' ? p : (p['#text'] || ''),
        divId: id,
        sectionType: 'verse',
      });
    }
  }
  
  return entries;
}

async function parseCommentaryXML(filepath, sourceId, volumeNum) {
  console.log(`📖 Parseando volumen ${volumeNum}...`);
  
  const xml = fs.readFileSync(filepath, 'utf-8');
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['div1', 'div2', 'div', 'p', 'scripRef'].includes(name),
    removeNSPrefix: true,
  });
  
  const result = parser.parse(xml);
  const body = result?.ThML?.['ThML.body'];
  
  if (!body) {
    console.error('❌ No se encontró ThML.body');
    return [];
  }
  
  const allEntries = [];
  const div1List = body.div1 || [];
  
  for (const div1 of div1List) {
    const title = div1['@_title'] || '';
    const bookMatch = title.match(/^(\w+)/);
    
    if (!bookMatch) continue;
    
    const bookAbbr = bookMatch[1];
    const bookInfo = BOOK_MAP[bookAbbr];
    
    if (!bookInfo) {
      console.warn(`Libro no mapeado: ${bookAbbr}`);
      continue;
    }
    
    // Procesar div2 (capítulos/secciones)
    const div2List = div1.div2 || [];
    for (const div2 of div2List) {
      const entries = extractCommentaryEntries(
        div2, 
        sourceId, 
        bookAbbr, 
        bookInfo.order
      );
      allEntries.push(...entries);
    }
    
    // También procesar párrafos directos en div1
    const directEntries = extractCommentaryEntries(
      div1, 
      sourceId, 
      bookAbbr, 
      bookInfo.order
    );
    allEntries.push(...directEntries);
  }
  
  console.log(`   ✅ ${allEntries.length} entradas extraídas`);
  return allEntries;
}

async function importEntries(entries) {
  const BATCH = 100;
  let total = 0;
  
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    
    await prisma.commentaryEntry.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    total += batch.length;
    process.stdout.write(`\r   📥 Entradas: ${total}/${entries.length}`);
  }
  console.log('');
}

async function main() {
  console.log('🚀 Importando Comentario Matthew Henry...\n');
  
  // 1. Crear o encontrar la fuente
  let source = await prisma.commentarySource.findUnique({
    where: { name: 'MHC' }
  });
  
  if (!source) {
    source = await prisma.commentarySource.create({
      data: {
        name: SOURCE_NAME,
        fullName: 'Comentario sobre toda la Biblia - Matthew Henry',
        author: 'Matthew Henry',
        volumes: 6,
        description: 'Comentario completo sobre toda la Biblia',
        publishedYear: '1706-1721',
        isPublicDomain: true,
      }
    });
    console.log('✅ Fuente creada:', source.name);
  } else {
    console.log('ℹ️  Fuente existente:', source.name);
  }
  
  // 2. Procesar cada volumen
  const volumes = [
    { file: 'mhc1.xml', num: 1 },
    { file: 'mhc2.xml', num: 2 },
    { file: 'mhc3.xml', num: 3 },
    { file: 'mhc4.xml', num: 4 },
    { file: 'mhc5.xml', num: 5 },
    { file: 'mhc6.xml', num: 6 },
  ];
  
  let totalEntries = 0;
  
  for (const vol of volumes) {
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Archivo no encontrado: ${vol.file}`);
      continue;
    }
    
    const entries = await parseCommentaryXML(filepath, source.id, vol.num);
    
    if (entries.length > 0) {
      console.log('💾 Importando entradas...');
      await importEntries(entries);
      totalEntries += entries.length;
    }
  }
  
  console.log('\n🎉 ¡IMPORTACIÓN COMPLETADA!');
  console.log(`   Total entradas: ${totalEntries}`);
}

main()
  .catch(e => {
    console.error('💥 ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
