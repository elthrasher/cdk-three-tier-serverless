import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Entity, Table } from 'dynamodb-onetable';
import Dynamo from 'dynamodb-onetable/Dynamo';

const client = new Dynamo({ client: new DynamoDBClient({}) });

const schema = {
  indexes: {
    primary: {
      hash: 'pk',
      sort: 'sk',
    },
  },
  models: {
    note: {
      type: {
        required: true,
        type: 'string',
        value: 'note',
      },
      pk: {
        type: 'string',
        value: 'note',
      },
      sk: {
        type: 'string',
        value: '${date}',
      },
      note: {
        required: true,
        type: 'string',
      },
      date: {
        required: true,
        type: 'string',
      },
      subject: {
        required: true,
        type: 'string',
      },
    },
  },
  version: '0.1.0',
  params: {
    typeField: 'type',
  },
  format: 'onetable:1.0.0',
} as const;

export type NoteType = Entity<typeof schema.models.note>;

const table = new Table({
  client,
  name: 'NotesTable',
  schema,
  timestamps: true,
});

export const Notes = table.getModel<NoteType>('note');
