import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { Notes } from './notesTable';
import { handler } from './writeFunction';

const note = {
  pk: 'note',
  sk: new Date().toISOString(),
  date: new Date().toISOString(),
  note: `Don't forget things!`,
  subject: 'An Important Note',
  type: 'note',
};

describe('Write Function', () => {
  beforeAll(() => {
    jest.spyOn(Notes, 'create').mockReturnValue(Promise.resolve(note));
  });
  test('Return a 200 response', async () => {
    const response = await handler({
      body: JSON.stringify({}),
    } as APIGatewayProxyEventV2);
    expect(response).toMatchObject({
      body: JSON.stringify(note),
      statusCode: 200,
    });
  });
});
