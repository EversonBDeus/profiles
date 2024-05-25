import * as lambda from "aws-cdk-lib/aws-lambda"
import * as cdk from "aws-cdk-lib"

import * as ssm from "aws-cdk-lib/aws-ssm"
import {Construct} from "constructs"

export class ProfilesAppLayersStack extends cdk.Stack {
    readonly profilesLayers: lambda.LayerVersion
    constructor(scope:Construct,id:string,props?:cdk.StackProps  ){
        super(scope,id,props)

        this.profilesLayers = new lambda.LayerVersion(this,"ProfilesLayer",{
            code:lambda.Code.fromAsset('lambda/profiles/layers/profilesLayer'),
            compatibleRuntimes:[lambda.Runtime.NODEJS_20_X],
            layerVersionName:"ProfilesLayer",
            removalPolicy:cdk.RemovalPolicy.RETAIN
        })
        new ssm.StringParameter(this,"ProfilesLayerVersionArn",{
           parameterName:"ProfilesLayerVersionArn",
           stringValue:this.profilesLayers.layerVersionArn
        })
    }
}

