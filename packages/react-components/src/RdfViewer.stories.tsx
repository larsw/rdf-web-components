import type { Meta, StoryObj } from "@storybook/react-vite";
import { RdfViewer } from "./components/RdfViewer";

const meta: Meta<typeof RdfViewer> = {
  title: "Components/RdfViewer",
  component: RdfViewer,
  tags: ["autodocs"],
  args: {
    showNamespaces: true,
    preferredLanguages: ["en"],
    showImagesInline: true,
  },
};

export default meta;

type Story = StoryObj<typeof RdfViewer>;

const sampleData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice a foaf:Person ;
  foaf:name "Alice"@en ;
  foaf:name "Alicia"@es ;
  foaf:mbox <mailto:alice@example.org> ;
  foaf:depiction <https://picsum.photos/200/200?random=11> .

ex:bob a foaf:Person ;
  foaf:name "Bob"@en ;
  foaf:mbox <mailto:bob@example.org> ;
  foaf:knows ex:alice .
`;

export const Table: Story = {
  args: {
    data: sampleData,
    layout: "table",
  },
};
