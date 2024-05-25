import { APIGatewayProxyEvent, APIGatewayProxyResult,Context } from "aws-lambda";
import { ProfileRepository } from "/op/nodejs/profilesLayer";
import {DynamoDB} from "aws-sdk"

const profilesDdb = process.env.PROFILES_DDB!

const ddbClient = new DynamoDB.DocumentClient()

const profileRepository = new ProfileRepository(ddbClient,profilesDdb)


export async function handler(event:APIGatewayProxyEvent,
    context:Context): Promise<APIGatewayProxyResult>{

        const lambdaRequestId = context.awsRequestId
        const apiRequestId = event.requestContext.requestId

        console.log(`API Gateway RequestId:${apiRequestId} - Lambda RequestID:${lambdaRequestId}`)

        const method = event.httpMethod
        if(event.resource === '/profiles'){
            if(method === 'GET'){
                console.log('GET /profiles')
                const profiles = await profileRepository.getAllProfiles()

                    return {
                        statusCode:200,
                        body:JSON.stringify(profiles)
                    }
                
            }

        } else if (event.resource === "/profiles/{id}"){
            const profileId = event.pathParameters!.id as string
            console.log(`GET /profiles/${profileId}`)

            try{
                const profile = await profileRepository.getProfileById(profileId)
            
            return {
                statusCode:200,
                body:JSON.stringify(profile)
            }
        } catch(error){
            console.error((<Error>error).message)
            return{
                statusCode:404,
                body:(<Error>error).message
            }
        }
            
        }
        return{
            statusCode:400,
            body:JSON.stringify({
                message:"Bad request"
            })
        }
    }