import { z } from "zod";
import { APIDataSourceProps } from "../types/react-agents";
import { BaseDataSource } from '../types/react-agents';

export class APIDataSourceManager implements BaseDataSource {
  id: string;
  type: 'api';
  name: string;
  description: string;
  endpoint: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  requiredArgs?: string[];
  examples?: string[];
  schema: z.ZodSchema;
  
  constructor(config: APIDataSourceProps) {
    this.id = config.id;
    this.type = 'api';
    this.name = config.name || config.id;
    this.description = config.description || '';
    this.endpoint = config.endpoint;
    this.headers = config.headers;
    this.params = config.params;
    this.requiredArgs = config.requiredArgs;
    this.examples = config.examples;
    this.schema = config.schema;
  }

  async pull(args: object = {}): Promise<any> {
  try {
    // Validate args against schema
    const validatedArgs = this.schema.parse(args);
    
    const url = new URL(this.endpoint);
    const params = { ...this.params, ...validatedArgs };
    
    Object.entries(params || {}).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.message}`);
      }
      console.error(`Error fetching from API ${this.id}:`, error);
      throw error;
    }
  }
}