import express from 'express';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';



import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();


/** 🔧 Helper to format history array into readable string */
function formatChatHistory(historyArray) {
  if (!Array.isArray(historyArray)) return '';
  return historyArray
    .map(({ role, content }) => {
      const speaker = role === 'user' ? 'User' : 'Assistant';
      return `${speaker}: ${content}`;
    })
    .join('\n');
}

router.post('/', async (req, res) => {
    const { question , history } = req.body;
    

    try {
        if (!question || typeof question !== 'string') {
            throw new Error("Invalid 'question' provided. Expected a non-empty string.");
        }

        const formattedHistory = formatChatHistory(history ? history : []);
        console.log('Formatted History:', formattedHistory);

        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
        const embeddings = new OpenAIEmbeddings(
            {
                openAIApiKey: process.env.OPENAI_API_KEY,
            }
        );
        const vectoreStore = await PineconeStore.fromExistingIndex(
            embeddings,
            { pineconeIndex: index, namespace: 'policy' }
        );

        const retriever = vectoreStore.asRetriever({
            k : 3
        });
        const model = new ChatOpenAI({
            temperature: 0,
            // modelName: 'gpt-3.5-turbo',
        });

        //~ chat assitant without previous conversation history
        // const prompt = PromptTemplate.fromTemplate(
        //     `Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion:\n{input}`
        // );

        //~ chat assitant with previous conversation history
        const prompt = PromptTemplate.fromTemplate(
            `You are a helpful assistant. Use the following conversation history and context to answer the current question.\n\nConversation History:\n{history}\n\nContext:\n{context}\n\nQuestion:\n{input}`
        );

        const combineDocsChain = await createStuffDocumentsChain({
            llm:model,
            prompt
        });

        //~ without previous conversation history
        // const chain = RunnableSequence.from([
        // async (input) => {
        //     const contextDocs = await retriever.invoke(input);
        //     return { input, context: contextDocs };
        // },
        // combineDocsChain,
        // ]);

        //~ with previous conversation history
        const chain = RunnableSequence.from([
        async (input) => {
            const contextDocs = await retriever.invoke(input.input);
            return {
            input: input.input,
            context: contextDocs,
            history: input.history ?? '',
            };
        },
        combineDocsChain,
        ]);
        
    
        // const response = await chain.invoke(question);
        const response = await chain.invoke({
            input: question,
            history: formattedHistory,
        });

        res.json({ answer: response ?? 'no response' });

    } catch (error) {
        console.error('Error: ', error.message);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

export default router;