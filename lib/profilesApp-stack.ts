import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import {Construct} from "constructs"

export class ProfilesAppStack extends cdk.Stack{
    readonly profilesFetchHandler:lambdaNodeJS.NodejsFunction
    readonly profilesAdminHandler:lambdaNodeJS.NodejsFunction
    readonly profilesDdb:dynamodb.Table

    constructor(scope:Construct,id:string,props?: cdk.StackProps ){
        super(scope,id,props)

        this.profilesDdb = new dynamodb.Table(this,"ProfilesDdb",{
            tableName:"profiles",
            removalPolicy:cdk.RemovalPolicy.DESTROY,
            partitionKey:{
                name:"id",
                type:dynamodb.AttributeType.STRING
            },
            billingMode:dynamodb.BillingMode.PROVISIONED,
            readCapacity:1,
            writeCapacity:1        
        })

        //Profiles Layer
        const profilesLayerArn = ssm.StringParameter.valueForStringParameter(this,"ProfilesLayerVersionArn")
        const profilesLayer = lambda.LayerVersion.fromLayerVersionArn(this,"ProfilesLayerVersionArn",profilesLayerArn)

        this.profilesFetchHandler = new lambdaNodeJS.NodejsFunction(this,"ProfilesFetchFunction",{
            functionName:"ProfilesFetchFunction",
         
            entry:"lambda/profiles/profilesFetchFunction.ts",
            handler:"handler",
            memorySize:512,
            timeout:cdk.Duration.seconds(5),
            bundling:{
                minify:true,
                sourceMap:false
            },
            environment:{
                PROFILES_DDB: this.profilesDdb.tableName
            },
            layers: [profilesLayer]
        })

        this.profilesDdb.grantReadData(this.profilesFetchHandler)

        this.profilesAdminHandler = new  lambdaNodeJS.NodejsFunction(this,"ProfilesAdminFunction",{
            functionName:"ProfilesAdminFunction",
         
            entry:"lambda/profiles/profilesAdminFunction.ts",
            handler:"handler",
            memorySize:512,
            timeout:cdk.Duration.seconds(5),
            bundling:{
                minify:true,
                sourceMap:false
            },
            environment:{
                PROFILES_DDB: this.profilesDdb.tableName
            },
            layers: [profilesLayer]
        })
        this.profilesDdb.grantWriteData(this.profilesAdminHandler)
    }
}