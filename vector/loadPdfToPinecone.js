import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const loadPdfToPinecone = async (pdfPath) => {
    const loader = new PDFLoader(pdfPath);
    const rawDocs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap : 200,
    });
    const chunks = await splitter.splitDocuments(rawDocs);

    console.log(`✅ Loaded ${chunks.length} chunks from PDF.`);

    const embeddings = new OpenAIEmbeddings(
        {
            openAIApiKey: process.env.OPENAI_API_KEY,
        }
    );

    const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    await PineconeStore.fromDocuments(chunks, embeddings, {
        pineconeIndex: index,
        namespace: 'policy',
    });

    console.log('✅ PDF embedded and stored to Pinecone successfully.');

}

export { loadPdfToPinecone };