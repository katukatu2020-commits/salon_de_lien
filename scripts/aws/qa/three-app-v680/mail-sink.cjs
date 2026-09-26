'use strict'
const fs=require('node:fs'),crypto=require('node:crypto')
if(process.env.ORIMIA_ISOLATED_QA!=='v680')throw Error('QA-only preload cannot run outside the isolated fixture')
process.env.SMS_PROVIDER='console'
process.env.SMS_DEV_SHOW_CODE='true'
const {createRequire}=require('node:module')
const appRequire=createRequire('/app/server.js')
appRequire('@aws-sdk/client-sns').SNSClient.prototype.send=async function(command){
  if(command.constructor.name!=='PublishCommand')throw Error('Unsupported QA SNS command')
  fs.appendFileSync('/tmp/qa-sms.jsonl',JSON.stringify(command.input)+'\n')
  return {MessageId:crypto.randomUUID()}
}
const original=globalThis.fetch
globalThis.fetch=async function(input,init={}){
  const url=new URL(typeof input==='string'?input:input.url||String(input))
  if(url.hostname==='api.postmarkapp.com'&&url.pathname.startsWith('/email')){
    const body=JSON.parse(String(init.body||'{}'))
    fs.appendFileSync('/tmp/qa-mail.jsonl',JSON.stringify({at:new Date().toISOString(),...body})+'\n')
    return new Response(JSON.stringify({ErrorCode:0,Message:'QA mail captured, not delivered',MessageID:crypto.randomUUID(),SubmittedAt:new Date().toISOString()}),{status:200,headers:{'Content-Type':'application/json'}})
  }
  if(!['localhost','127.0.0.1','salon_de_lien_postgres'].includes(url.hostname)){
    fs.appendFileSync('/tmp/qa-blocked.jsonl',JSON.stringify({at:new Date().toISOString(),host:url.hostname,path:url.pathname,method:init.method||'GET'})+'\n')
    throw Error('External network disabled in isolated QA: '+url.hostname)
  }
  return original(input,init)
}
