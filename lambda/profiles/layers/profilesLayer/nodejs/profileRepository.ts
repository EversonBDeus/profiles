import {DocumentClient } from "aws-sdk/clients/dynamodb"
import {v4 as uuid} from "uuid"

export interface Profile{
    id:string; 
    profileName:string;
    favoriteMovie?:number[];
    watchlist?:number[];
    watched?:number[];
    genresWatched?: { [genre: string]: number };
    userAdmin?:Boolean;
    userId:string;
    userPin?:string;
}

export class ProfileRepository {
    private ddbClient:DocumentClient
    private profilesDdb: string
    constructor(ddbCliente:DocumentClient, profilesDdb:string){
        this.ddbClient = ddbCliente
        this.profilesDdb = profilesDdb
        
    }
    
    async getAllProfiles(): Promise <Profile[]> {
        const data = await this.ddbClient.scan({
             TableName:this.profilesDdb
         }).promise()
         return data.Items as Profile[]
     }
 
  //?-----  Buscar profile id   -----//
 
     async getProfileById( profileId: string ) : Promise < Profile > {
         const data = await this.ddbClient.get({
             TableName:this.profilesDdb,
             Key:{
                 id:profileId
             }
         }).promise()
         if(data.Item){
             return data.Item as Profile
         } else {
             throw new Error('Profile not found')
         }
     }
 
  //?-----   Pesquisar os profile na tabela    -----//
     
     async getProfileByIds(profileIds: string[]): Promise<Profile[]>{
         const keys: { id: string; }[] = []
 
         profileIds.forEach((profileId) => {
             keys.push({
                id:profileId
             })
         })
         const data = await this.ddbClient.batchGet({
             RequestItems: {
                 [this.profilesDdb]: {
                    Keys:keys
                }
            }
         }).promise()
         return data.Responses![this.profilesDdb] as Profile[]
     }
  //?-----   Criar profile    -----//
     async create(profile: Profile) : Promise<Profile>{
       profile.id = uuid()
       await this.ddbClient.put({
             TableName:this.profilesDdb,
             Item:profile
         }).promise()
         return profile
     }     
 
  //?-----   Deletar profile    -----//
 
     async deleteProfile(profileId:string) : Promise < Profile > {
     const data = await this.ddbClient.delete({
         TableName:this.profilesDdb,
         Key:{
             id: profileId
         },
         ReturnValues : "ALL_OLD"
     }).promise()
     if(data.Attributes){
         return data.Attributes as Profile
     } else {
         throw new Error ('Profile not found')
     }
  }

    //?-----   Atualizar profile    -----//

    async updateProfile(profileId:string, profile:Profile): Promise<Profile>{
        const data =  await this.ddbClient.update({
            TableName:this.profilesDdb,
            Key:{
                id:profileId
            },
            ConditionExpression:'attribute_exists(id)',
            ReturnValues:"UPDATED_NEW",
            UpdateExpression: "set id = :id, profileName = :n, favoriteMovie = :f, watchlist = :w, watched = :wd, genresWatched = :g, userAdmin = :ua, userid = :ui, userPin = :up",
            ExpressionAttributeValues: {
                ":id": profile.id,
                ":n": profile.profileName,
                ":f": profile.favoriteMovie,
                ":w": profile.watchlist,
                ":wd": profile.watched,
                ":g": profile.genresWatched,
                ":ua": profile.userAdmin,
                ":ui":profile.userId,
                ":up": profile.userPin
            }
        }).promise()
        data.Attributes!.id = profileId
        return data.Attributes as Profile
    }
}