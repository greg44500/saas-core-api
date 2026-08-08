import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { env } from '../config/env.js';

const assertTestDatabase = () => {
  if (!env.MONGODB_URI.includes('_test')) {
    throw new Error(
      'Sécurité tests : MONGODB_URI doit pointer vers une base explicitement dédiée aux tests.',
    );
  }
};

beforeAll(async () => {
  assertTestDatabase();

  await mongoose.connect(env.MONGODB_URI);
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;

  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});