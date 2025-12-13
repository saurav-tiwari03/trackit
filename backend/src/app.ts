import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from TypeScript backend!' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default app;
