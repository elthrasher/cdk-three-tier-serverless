import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import {
  CfnOutput,
  DockerImage,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { execSync, ExecSyncOptions } from 'child_process';
import { Construct } from 'constructs';
import { copySync } from 'fs-extra';
import { join } from 'path';

export class CdkThreeTierServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Demo-quality props. For production, you want a different removalPolicy and possibly a different billingMode.
    const table = new Table(this, 'NotesTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey: { name: 'sk', type: AttributeType.STRING },
      tableName: 'NotesTable',
    });

    // Functions could have memory tuned to save $$, but should be pretty cheap in any case.
    const readFunction = new NodejsFunction(this, 'ReadNotesFn', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/readFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
    });

    const writeFunction = new NodejsFunction(this, 'WriteNoteFn', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/writeFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
    });

    table.grantReadData(readFunction);

    table.grantWriteData(writeFunction);

    // API could be improved with authorization and models to validate payloads.
    // In production, you will want access logging.
    const api = new HttpApi(this, 'NotesApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowOrigins: ['*'],
      },
    });

    // Creates the Cfn AWS::ApiGatewayV2::Integration resources
    const readIntegration = new HttpLambdaIntegration(
      'ReadIntegration',
      readFunction
    );
    const writeIntegration = new HttpLambdaIntegration(
      'WriteIntegration',
      writeFunction
    );

    // Creates the Cfn AWS::ApiGatewayV2::Route resources, assigning a path to an integration
    api.addRoutes({
      integration: readIntegration,
      methods: [HttpMethod.GET],
      path: '/notes',
    });
    api.addRoutes({
      integration: writeIntegration,
      methods: [HttpMethod.POST],
      path: '/notes',
    });

    // Storage for assets only. NOT an S3 website.
    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Grant read access to the distribution.
    const originAccessIdentity = new OriginAccessIdentity(
      this,
      'OriginAccessIdentity'
    );
    websiteBucket.grantRead(originAccessIdentity);

    // Cloudfront distribution with SPA config and https upgrade.
    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new S3Origin(websiteBucket, { originAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    const execOptions: ExecSyncOptions = {
      stdio: ['ignore', process.stderr, 'inherit'],
    };

    // Run vite build to transpile React application, then copy to cdk.out.
    // Docker build can't be omitted, even though we don't use it.
    const bundle = Source.asset(join(__dirname, 'web'), {
      bundling: {
        command: [
          'sh',
          '-c',
          'echo "Docker build not supported. Please install esbuild."',
        ],
        image: DockerImage.fromRegistry('alpine'),
        local: {
          tryBundle(outputDir: string) {
            try {
              execSync('esbuild --version', execOptions);
            } catch {
              return false;
            }
            execSync('npx vite build', execOptions);
            copySync(join(__dirname, '../dist'), outputDir, {
              ...execOptions,
              recursive: true,
            });
            return true;
          },
        },
      },
    });

    // Need to set prune to false or the config.json file will be pruned.
    // If deployments are frequent, should look into a way to clean up old files.
    new BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: websiteBucket,
      distribution,
      logRetention: RetentionDays.ONE_DAY,
      prune: false,
      sources: [bundle],
    });

    // Generate a config.json file and place in S3 so the web app can grab the API URL.
    new AwsCustomResource(this, 'ApiUrlResource', {
      logRetention: RetentionDays.ONE_DAY,
      onUpdate: {
        action: 'putObject',
        parameters: {
          Body: Stack.of(this).toJsonString({
            [this.stackName]: { HttpApiUrl: api.apiEndpoint },
          }),
          Bucket: websiteBucket.bucketName,
          CacheControl: 'max-age=0, no-cache, no-store, must-revalidate',
          ContentType: 'application/json',
          Key: 'config.json',
        },
        physicalResourceId: PhysicalResourceId.of('config'),
        service: 'S3',
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [websiteBucket.arnForObjects('config.json')],
        }),
      ]),
    });

    new CfnOutput(this, 'HttpApiUrl', { value: api.apiEndpoint });

    new CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });
  }
}
