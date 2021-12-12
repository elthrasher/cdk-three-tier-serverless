import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { Notes } from './notesTable';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const body = event.body;
  if (body) {
    const notes = await Notes.create(JSON.parse(body));
    return { body: JSON.stringify(notes), statusCode: 200 };
  }
  return { body: 'Error, invalid input!', statusCode: 400 };
};
