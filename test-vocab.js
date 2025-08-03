import { Parser } from 'n3';
import fs from 'fs';

console.log('Testing vocabulary parsing...');

let foafData = fs.readFileSync('./vocabularies/foaf.rdf', 'utf8');
console.log('Original first 100 chars:');
console.log(foafData.substring(0, 100));

// Apply the cleanup
foafData = foafData.replace(/^(\s*<!--[\s\S]*?-->\s*)*/g, '').trim();

console.log('\nAfter cleanup first 100 chars:');
console.log(foafData.substring(0, 100));

try {
  const parser = new Parser({ format: 'application/rdf+xml' });
  const quads = parser.parse(foafData);
  console.log('\nSuccess! Parsed', quads.length, 'triples');
} catch (error) {
  console.log('\nError:', error.message);
}
