#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProfilesAppStack } from '../lib/profilesApp-stack';
import { CineconnectApiStack } from '../lib/cineconnectApi-stack';
import { ProfilesAppLayersStack } from '../lib/profilesAppLayer-stack'; 

const app = new cdk.App();

const env:cdk.Environment = {
  account:"975050159416",
  region:"sa-east-1"
}

const tags = {
  cost:"CineConnect",
  team:"Everson Boeira de Deus"
}
const profilesAppLayersStack = new ProfilesAppLayersStack(app,"ProfilesAppLayers",{
  tags:tags,
  env:env
})

const profilesAppStack = new ProfilesAppStack(app,"ProfilesApp",{
  tags:tags,
  env:env
})

profilesAppStack.addDependency(profilesAppLayersStack)

const cineconnectApiStack = new CineconnectApiStack(app,"CineconnectApi",{
  profilesFetchHandler:profilesAppStack.profilesFetchHandler,
  profilesAdminHandler:profilesAppStack.profilesAdminHandler,
  tags:tags,
  env:env
})
cineconnectApiStack.addDependency(profilesAppStack)

