import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'runway-api' });
});

// Routes will be mounted here as we build them
// app.use('/api/engagements', engagementRoutes);
// app.use('/api/resources', resourceRoutes);

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, () => {
  console.log(`Runway API on :${PORT}`);
});

export default app;
