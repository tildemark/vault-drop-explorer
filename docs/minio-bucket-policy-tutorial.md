# MinIO Bucket-Restricted Access Key Tutorial

This tutorial explains how to configure MinIO IAM policies to create an Access Key / User restricted to a single bucket (or set of buckets).

---

## Overview

By default, the MinIO Root User (`minioadmin`) has full admin permissions across all buckets. For production applications, backups, or client access, you should create restricted Access Keys that only have read/write access to specific buckets.

---

## Step 1: Create Policy JSON (`bucket-policy.json`)

Create a policy JSON file named `bucket-policy.json`. Replace `my-target-bucket` with your actual bucket name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-target-bucket"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::my-target-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets"
      ],
      "Resource": [
        "arn:aws:s3:::*"
      ]
    }
  ]
}
```

> 💡 **Note**: Including `"s3:ListAllMyBuckets"` allows bucket explorer tools (like **Vault Drop Explorer**) to execute `ListBuckets` without failing, while restricting actual object reads and writes exclusively to `my-target-bucket`.

---

## Method 1: Configure using MinIO Client CLI (`mc`)

1. **Set up server alias**:
   ```bash
   mc alias set myminio http://localhost:9000 minioadmin minioadmin
   ```

2. **Create the policy in MinIO**:
   ```bash
   mc admin policy create myminio bucket-restricted-policy bucket-policy.json
   ```

3. **Create the User & Attach Policy**:
   ```bash
   # Create a user (Access Key + Secret Key)
   mc admin user add myminio app-user-key AppSecretKey123!

   # Attach policy to user
   mc admin policy attach myminio bucket-restricted-policy --user app-user-key
   ```

4. **(Alternative) Create a Service Account for an App**:
   ```bash
   mc admin user svcacct add myminio admin \
     --access-key "MINIO_APP_ACCESS_KEY" \
     --secret-key "MINIO_APP_SECRET_KEY" \
     --policy bucket-policy.json
   ```

---

## Method 2: Configure via MinIO Web Console

1. Log into your MinIO Console (e.g. `http://localhost:9001`).
2. Navigate to **Identity** → **Policies** → **Create Policy**.
3. Policy Name: `bucket-restricted-policy`.
4. Paste the JSON content from **Step 1** above and click **Save**.
5. Navigate to **Identity** → **Users** (or **Service Accounts**) → **Create User**.
6. Enter Access Key ID and Secret Key.
7. Under **Policies**, select **`bucket-restricted-policy`** and click **Save**.

---

## Connecting from Vault Drop Explorer

1. Launch **Vault Drop Explorer**.
2. Select **MinIO (Self-Hosted)** from the preset dropdown.
3. Server Endpoint: `http://localhost:9000` (or your domain).
4. Enter Access Key: `app-user-key` (or `MINIO_APP_ACCESS_KEY`).
5. Enter Secret Key: `AppSecretKey123!`.
6. Click **Connect & List Buckets**.

Your connection is now securely restricted to `my-target-bucket`.
