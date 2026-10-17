import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const typeDefs = `#graphql
  type Category {
    id: ID!
    name: String!
    products: [Product!]!
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    stock: Int!
    category: Category!
  }

  type Query {
    categories: [Category!]!
    products: [Product!]!
    product(id: ID!): Product
  }
`;

const resolvers = {
  Query: {
    categories: async () => {
      const result = await pool.query('SELECT * FROM categories');
      return result.rows;
    },
    products: async () => {
      const result = await pool.query('SELECT * FROM products');
      return result.rows;
    },
    product: async (_, { id }) => {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      return result.rows[0];
    }
  },
  Product: {
    category: async (parent) => {
      const result = await pool.query('SELECT * FROM categories WHERE id = $1', [parent.category_id]);
      return result.rows[0];
    }
  },
  Category: {
    products: async (parent) => {
      const result = await pool.query('SELECT * FROM products WHERE category_id = $1', [parent.id]);
      return result.rows;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true
});

const { url } = await startStandaloneServer(server, {
  listen: { port: process.env.PORT || 4000 }
});

console.log(`🚀 GraphQL Server berjalan di ${url}`);