import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { CdkThreeTierServerlessStack } from './cdk-three-tier-serverless-stack';

describe('Stack test', () => {
  test('snapshot', () => {
    const app = new App();
    const stack = new CdkThreeTierServerlessStack(app, 'TestStack');
    const cfn = Template.fromStack(stack).toJSON();
    const resources = cfn.Resources;
    const matchObject: {
      Parameters: Record<string, unknown>;
      Resources: Record<string, unknown>;
    } = {
      Parameters: expect.any(Object),
      Resources: {},
    };
    Object.keys(resources).forEach((res) => {
      switch (resources[res].Type) {
        case 'AWS::Lambda::Function':
          matchObject.Resources[res] = {
            Properties: { Code: expect.any(Object) },
          };
          break;
        case 'Custom::CDKBucketDeployment':
          matchObject.Resources[res] = {
            Properties: {
              SourceBucketNames: expect.any(Array),
              SourceObjectKeys: expect.any(Object),
            },
          };
          break;
        default:
          break;
      }
    });
    expect(cfn).toMatchSnapshot(matchObject);
  });
});
