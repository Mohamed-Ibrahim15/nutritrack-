<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your OTP Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #333333;
    }
    .wrapper {
      max-width: 520px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 36px 40px 28px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    }
    .body {
      padding: 36px 40px;
      text-align: center;
    }
    .body p {
      font-size: 15px;
      line-height: 1.6;
      color: #555555;
      margin: 0 0 24px;
    }
    .otp-box {
      display: inline-block;
      background: #f0edff;
      border: 2px dashed #7c3aed;
      border-radius: 10px;
      padding: 18px 40px;
      margin: 8px 0 28px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #4f46e5;
      font-family: 'Courier New', monospace;
    }
    .expiry-note {
      font-size: 13px;
      color: #e53e3e;
      font-weight: 600;
      margin: 0 0 24px;
    }
    .divider {
      border: none;
      border-top: 1px solid #eeeeee;
      margin: 24px 0;
    }
    .warning {
      font-size: 12px;
      color: #999999;
      line-height: 1.5;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #aaaaaa;
      border-top: 1px solid #eeeeee;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <div class="header">
      <h1>{{ config('app.name') }}</h1>
      <p>Password Reset Request</p>
    </div>

    <div class="body">
      <p>You requested to reset your password. Use the OTP below to complete the process.</p>

      <div class="otp-box">
        <div class="otp-code">{{ $otp }}</div>
      </div>

      <p class="expiry-note">⏱ This code expires in <strong>10 minutes</strong>.</p>

      <hr class="divider" />

      <p class="warning">
        If you did not request a password reset, please ignore this email.<br />
        Do <strong>not</strong> share this code with anyone.
      </p>
    </div>

    <div class="footer">
      © {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
    </div>

  </div>
</body>
</html>
