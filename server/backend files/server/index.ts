import express from 'express';     
import app from './api';           
import dotenv from 'dotenv';

dotenv.config();


// Bind to 0.0.0.0 for Render and use proper port handling
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});