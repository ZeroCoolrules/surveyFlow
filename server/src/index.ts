import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { webhooksRouter } from './routes/webhooks.js';
import { apiRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';
import './db/index.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/webhooks', webhooksRouter);
app.use('/api/admin', adminRouter);
app.use('/api', apiRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`SurveyFlow API listening on :${port}`);
});
