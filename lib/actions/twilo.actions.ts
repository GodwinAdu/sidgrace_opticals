"use server"
import twilio from "twilio"

// Your Twilio Account SID, Auth Token, and Twilio Phone Number
const accountSid = process.env.TWILO_SID!
const authToken = process.env.TWILO_AUTH_TOKEN!
const twilioPhoneNumber = process.env.TWILO_NUMBER!

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Function to send SMS
export async function sendSMS(phoneNumber: string, message: string) {
    try {
        const result = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: phoneNumber,
        });

        console.log('SMS Sent Successfully. SID:', result.sid);
        return result;
    } catch (error) {
        console.error('Error Sending SMS:', error);
        throw error;
    }
}

