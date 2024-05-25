import { APIGatewayProxyEvent, APIGatewayProxyResult,Context } from "aws-lambda";

import {DynamoDB} from "aws-sdk"
import { Profile, ProfileRepository } from "/op/nodejs/profilesLayer";


const profilesDdb = process.env.PROFILES_DDB!

const ddbClient = new DynamoDB.DocumentClient()

const profileRepository = new ProfileRepository(ddbClient,profilesDdb)

export async function handler(event:APIGatewayProxyEvent,
    context:Context): Promise<APIGatewayProxyResult>{

        const lambdaRequestId = context.awsRequestId
        const apiRequestId = event.requestContext.requestId

        console.log(`API Gateway RequestId:${apiRequestId} - Lambda RequestID:${lambdaRequestId}`)

        if(event.resource === "/profiles"){
            console.log("POST /profiles")
            const profile = await JSON.parse(event.body!) as Profile
            const profileCreated = await profileRepository.create(profile)
            return{
                statusCode:201,
                body:JSON.stringify(profileCreated)
            }
        } else if (event.resource === "/profiles/{id}"){
            const profileId = event.pathParameters!.id as string
            if(event.httpMethod === "PUT"){
                console.log(`PUT /profiles/${profileId}`)
                const profile = JSON.parse(event.body!) as Profile

                try{
                    const profileUpdated = await  profileRepository.updateProfile(profileId,profile)

                    return{
                        statusCode:200,
                        body:JSON.stringify(profileUpdated)
                    }
                } catch(ConditionCheckFailedException){

                    return{
                        statusCode:404,
                        body:'Profile not found'
                    }                 
                }

            } else if (event.httpMethod === "DELETE"){
                console.log(`DELETE /profiles/${profileId}`)
                try{
                    const profile = await profileRepository.deleteProfile(profileId)
                    return{
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
        }
        return {
            statusCode:400,
            body:"Bad request"
        }
}