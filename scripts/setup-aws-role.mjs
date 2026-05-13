import { IAMClient, CreateRoleCommand, PutRolePolicyCommand, GetRoleCommand } from "@aws-sdk/client-iam";

const client = new IAMClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const trustPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { Service: "lambda.amazonaws.com" },
      Action: "sts:AssumeRole",
    },
  ],
};

const executionPolicy = {
  Version: "2012-10-17",
  Statement: [
    { Sid: "0", Effect: "Allow", Action: ["s3:ListAllMyBuckets"], Resource: ["*"] },
    {
      Sid: "1",
      Effect: "Allow",
      Action: ["s3:CreateBucket","s3:ListBucket","s3:PutBucketAcl","s3:GetObject","s3:DeleteObject","s3:PutObjectAcl","s3:PutObject","s3:GetBucketLocation"],
      Resource: ["arn:aws:s3:::remotionlambda-*"],
    },
    {
      Sid: "2",
      Effect: "Allow",
      Action: ["lambda:InvokeFunction"],
      Resource: ["arn:aws:lambda:*:*:function:remotion-render-*"],
    },
    {
      Sid: "3",
      Effect: "Allow",
      Action: ["logs:CreateLogGroup"],
      Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda-insights"],
    },
    {
      Sid: "4",
      Effect: "Allow",
      Action: ["logs:CreateLogStream","logs:PutLogEvents"],
      Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*","arn:aws:logs:*:*:log-group:/aws/lambda-insights:*"],
    },
  ],
};

try {
  await client.send(new GetRoleCommand({ RoleName: "remotion-lambda-role" }));
  console.log("Role already exists, updating policy...");
} catch {
  console.log("Creating role remotion-lambda-role...");
  await client.send(new CreateRoleCommand({
    RoleName: "remotion-lambda-role",
    AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
    Description: "Execution role for Remotion Lambda renders",
  }));
  console.log("Role created.");
}

await client.send(new PutRolePolicyCommand({
  RoleName: "remotion-lambda-role",
  PolicyName: "remotion-execution-policy",
  PolicyDocument: JSON.stringify(executionPolicy),
}));
console.log("Policy attached. Role is ready.");
