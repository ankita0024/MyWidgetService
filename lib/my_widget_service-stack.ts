import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Function } from '@aws-cdk/aws-lambda';
import { LambdaIntegration } from '@aws-cdk/aws-apigateway';

export class MyWidgetServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const wordlistTable = new dynamodb.Table(this, 'WordlistTable', {
      partitionKey: { name: 'word', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'length', type: dynamodb.AttributeType.NUMBER }
    });
    wordlistTable.addGlobalSecondaryIndex({
      indexName: 'LengthIndex',
      partitionKey: { name: 'length', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    const addWordHandler = new Function(this, 'AddWordHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
      handler: 'add-word.handler',
      environment: {
        WORDLIST_TABLE_NAME: wordlistTable.tableName
      }
    })

    const getWordsHandler = new Function(this, 'GetWordsIntegration', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
      handler: 'get-words.handler',
      environment: {
        WORDLIST_TABLE_NAME: wordlistTable.tableName
      }
    })
    
    wordlistTable.grantReadWriteData(addWordHandler);
    wordlistTable.grantReadData(getWordsHandler);

    const api = new apigateway.RestApi(this, 'WordlistApi');

    const addWordIntegration = new LambdaIntegration(addWordHandler);
    const getWordsIntegration = new LambdaIntegration(getWordsHandler);

      const wordResource = api.root.addResource('wordlist');

      wordResource.addMethod('PUT', addWordIntegration);
      wordResource.addResource('{length}').addMethod('GET', getWordsIntegration,{ 
        authorizationType: apigateway.AuthorizationType.NONE,
      });

  }
}
