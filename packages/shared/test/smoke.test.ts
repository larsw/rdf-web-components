import { expect, test } from "bun:test";
import { findVocabularyByKey, parseRdf } from "../src";

test("parseRdf parses turtle input", () => {
  const quads = parseRdf(
    '@prefix ex: <http://example.org/> . ex:alice ex:name "Alice" .',
    "turtle",
  );

  expect(quads.length).toBe(1);
});

test("findVocabularyByKey returns a descriptor", () => {
  const vocab = findVocabularyByKey("foaf");
  expect(vocab?.route).toBe("/vocab/foaf");
});
