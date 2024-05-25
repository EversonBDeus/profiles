
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"
import {Construct} from "constructs"
import { Authorization } from "aws-cdk-lib/aws-events"
interface CineconnectApiStackProps extends cdk.StackProps{
    profilesFetchHandler: lambdaNodeJS.NodejsFunction
    profilesAdminHandler: lambdaNodeJS.NodejsFunction
}
export class CineconnectApiStack extends cdk.Stack{

        private profilesAuthorizer:apigateway.CognitoUserPoolsAuthorizer
        private customerPool: cognito.UserPool
        private adminPool: cognito.UserPool

    constructor(scope:Construct,id:string,props: CineconnectApiStackProps ){
        super(scope,id,props)

        const logGroup = new cwlogs.LogGroup(this,"CineconnectApiLogs")
        const api = new apigateway.RestApi(this,"CineconnectApi",{
            restApiName:"CineconnectApi",
            cloudWatchRole: true,
            deployOptions:{
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat:apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod:true,
                    ip:true,
                    protocol:true,
                    requestTime:true,
                    resourcePath:true,
                    responseLength:true,
                    status:true,
                    caller:true,
                    user:true
                  
                })
            }
        })

        const profilesFetchIntegration = new apigateway.LambdaIntegration(props.profilesFetchHandler)

        const profilesFetchWebMobileIntegration = {
            Authorizer:this.profilesAuthorizer,
            authorizationType:apigateway.AuthorizationType.COGNITO,
            authorizationScopes:['customer/web','customer/mobile']
        }
        this.createCognitoAuth() 

        //GET "/profiles"
        const profilesResource = api.root.addResource("profiles")
        profilesResource.addMethod("GET",profilesFetchIntegration,profilesFetchWebMobileIntegration)

         //GET "/profiles/{id}"
         const profileIdResource = profilesResource.addResource("{id}")
         profileIdResource.addMethod("GET",profilesFetchIntegration,profilesFetchWebMobileIntegration)

         const profilesAdminIntegration = new apigateway.LambdaIntegration(props.profilesAdminHandler)
//================================================================ //
         // POST /profiles
         profilesResource.addMethod("POST",profilesAdminIntegration,profilesFetchWebMobileIntegration)
         //PUT /profiles/{id}
         profileIdResource.addMethod("PUT",profilesAdminIntegration,profilesFetchWebMobileIntegration)
         //DELETE /profiles/{id}
         profileIdResource.addMethod("DELETE",profilesAdminIntegration,profilesFetchWebMobileIntegration)
    }

    private createCognitoAuth(){

        const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(this,"PostConfirmationFunction",{
            functionName:"PostConfirmationFunction",
         
            entry:"lambda/auth/postConfirmationFunction.ts",
            handler:"handler",
            memorySize:512,
            timeout:cdk.Duration.seconds(2),
            bundling:{
                minify:true,
                sourceMap:false
            },
            tracing:lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })



        const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(this,"PreAuthenticationFunction",{
            functionName:"PreAuthenticationFunction",
         
            entry:"lambda/auth/preAuthenticationFunction.ts",
            handler:"handler",
            memorySize:512,
            timeout:cdk.Duration.seconds(2),
            bundling:{
                minify:true,
                sourceMap:false
            },
            tracing:lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        })




        //Cognito customer UserPool
        this.customerPool = new cognito.UserPool(this,"CustomerPool",{
            lambdaTriggers:{
                preAuthentication:preAuthenticationHandler,
                postConfirmation:postConfirmationHandler
            },
            userPoolName:"CustomerPool",
            removalPolicy:cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled:true,
            autoVerify:{  
                email:true,
                phone:false
            },
            userVerification:{
                emailSubject:"Verify your email for the CineConnect service!",
                emailBody:"Thanks for signing up to CineConnect service! Your verification code is {####}",
                emailStyle:cognito.VerificationEmailStyle.CODE,
            },
            signInAliases:{
                username:false,
                email:true
            },
            standardAttributes:{
                fullname:{
                    required:true,
                    mutable:false 
                },
                email:{
                    required:true,
                    mutable:false 
                },
                birthdate:{
                    required:true,
                    mutable:false 
                }
            },
            passwordPolicy:{
              minLength:8,
              requireLowercase:true,
              requireUppercase:true,
              requireDigits:true,
              requireSymbols:true,
            },
            accountRecovery:cognito.AccountRecovery.EMAIL_ONLY
        })

        this.customerPool.addDomain("CustomerDomain",{
            cognitoDomain:{
               domainPrefix:"ebd-customer-service" 
            }
        })
        const customerWebScope =  new cognito.ResourceServerScope({
            scopeName:"web",
            scopeDescription:"Customer web operation"
        })
        const customerMobileScope =  new cognito.ResourceServerScope({
            scopeName:"mobile",
            scopeDescription:"Customer mobile operation"
        })
        const customerResoucerServer = this.customerPool.addResourceServer("CustomerResourceServer",{
         identifier:"customer",
         userPoolResourceServerName:"CustomerResourceServer",
         scopes:[customerWebScope,customerMobileScope]
        })
        this.customerPool.addClient("customer-web-client",{
            userPoolClientName:"customerWebClient",
            authFlows:{
                userPassword:true
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity:cdk.Duration.days(7),
            oAuth:{
                scopes:[cognito.OAuthScope.resourceServer(customerResoucerServer,customerWebScope)]
            }
        })
        this.customerPool.addClient("customer-mobile-client",{
            userPoolClientName:"customerMobileClient",
            authFlows:{
                userPassword:true
            },
            accessTokenValidity: cdk.Duration.minutes(60),
            refreshTokenValidity:cdk.Duration.days(7),
            oAuth:{
                scopes:[cognito.OAuthScope.resourceServer(customerResoucerServer,customerMobileScope)]
            }
        })
        this.profilesAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this,"ProfilesAuthorizer",{
            authorizerName:"ProfilesAuthorizer",
            cognitoUserPools:[this.customerPool]
        })
    }
}