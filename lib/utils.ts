import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}


export function truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength).trimEnd() + '...';
}


// utils/sms.ts
// This file contains helper functions for SMS character encoding and segment calculation.

// GSM 7-bit default alphabet characters
const GSM_7BIT_CHARS =
  "@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~]|€ÆæßÉ!\"#%&'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// GSM 7-bit extension characters (each counts as 2 characters)
const GSM_7BIT_EXT_CHARS = "^{}\\[~]|€"

/**
 * Checks if a character is part of the GSM 7-bit alphabet.
 * @param char The character to check.
 * @returns True if the character is GSM 7-bit, false otherwise.
 */
export function isGsm7Bit(char: string): boolean {
  return GSM_7BIT_CHARS.includes(char) || GSM_7BIT_EXT_CHARS.includes(char)
}

/**
 * Determines the SMS encoding required for a given message.
 * If any character is not GSM 7-bit, UCS-2 encoding is required.
 * @param message The SMS message content.
 * @returns 'GSM-7' or 'UCS-2'.
 */
export function getSmsEncoding(message: string): "GSM-7" | "UCS-2" {
  for (const char of message) {
    if (!isGsm7Bit(char)) {
      return "UCS-2"
    }
  }
  return "GSM-7"
}

/**
 * Calculates the number of SMS segments for a given message.
 * Accounts for GSM 7-bit and UCS-2 encoding, and concatenated message limits.
 * @param message The SMS message content.
 * @returns An object containing segments, characters per segment, and encoding type.
 */
export function calculateSmsSegments(message: string) {
  const encoding = getSmsEncoding(message)
  let charCount = 0

  if (encoding === "GSM-7") {
    for (const char of message) {
      if (GSM_7BIT_EXT_CHARS.includes(char)) {
        charCount += 2 // Extension characters count as 2
      } else {
        charCount += 1
      }
    }
    const singleSmsLimit = 160
    const concatSmsLimit = 153

    if (charCount <= singleSmsLimit) {
      return { segments: 1, charsPerSegment: singleSmsLimit, encoding, charCount }
    } else {
      const segments = Math.ceil(charCount / concatSmsLimit)
      return { segments, charsPerSegment: concatSmsLimit, encoding, charCount }
    }
  } else {
    // UCS-2 encoding
    charCount = message.length // Each character is 2 bytes
    const singleSmsLimit = 70
    const concatSmsLimit = 67

    if (charCount <= singleSmsLimit) {
      return { segments: 1, charsPerSegment: singleSmsLimit, encoding, charCount }
    } else {
      const segments = Math.ceil(charCount / concatSmsLimit)
      return { segments, charsPerSegment: concatSmsLimit, encoding, charCount }
    }
  }
}

/**
 * Replaces dynamic variables in a message with example data for preview.
 * @param message The message content with variables (e.g., "Hello {{name}}").
 * @param data An object mapping variable names to example values (e.g., { name: "John Doe" }).
 * @returns The message with variables replaced.
 */
export function replaceVariables(message: string, data: Record<string, string>): string {
  let previewMessage = message
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
      previewMessage = previewMessage.replace(regex, data[key])
    }
  }
  return previewMessage
}
