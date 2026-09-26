'use strict'
const http=require('node:http')
http.createServer((req,res)=>{
  req.headers['x-forwarded-proto']='http'
  req.headers['x-forwarded-host']=req.headers.host
  const upstream=http.request({hostname:'orimia-qa-v680-app',port:3000,path:req.url,method:req.method,headers:req.headers},reply=>{
    res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)
  })
  upstream.on('error',()=>{res.statusCode=502;res.end('Isolated QA backend not ready')})
  req.pipe(upstream)
}).listen(3000,'0.0.0.0')
