import { Parser } from 'n3';
import { findVocabularyByKey } from '@rdf-web-components/shared';

console.log('Testing vocabulary parsing with Bun...');

const foafDescriptor = findVocabularyByKey('foaf');
if (!foafDescriptor) {
  throw new Error('Unable to locate FOAF vocabulary metadata');
}

let foafData = await Bun.file(foafDescriptor.filePath).text();
console.log('Original first 100 chars:');
console.log(foafData.substring(0, 100));

// Apply the same cleanup as in the RDF viewer
foafData = foafData.replace(/^(\s*<!--[\s\S]*?-->\s*)*/g, '').trim();

console.log('\nAfter cleanup first 100 chars:');
console.log(foafData.substring(0, 100));

try {
  const parser = new Parser({ format: 'text/turtle' } as any);
  const quads = parser.parse(foafData);
  console.log('\nSuccess! Parsed', quads.length, 'triples');
} catch (error) {
  console.log('\nError:', (error as Error).message);
}
