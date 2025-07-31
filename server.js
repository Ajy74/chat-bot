import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import askRouter from './routes/ask.js';
// import { loadPdfToPinecone } from './vector/loadPdfToPinecone.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

//~ load PDF only once server starts
// loadPdfToPinecone('./asset/Infozzle_Policy.pdf');


app.use('/ask', askRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});