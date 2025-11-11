import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import { fetch } from 'wix-fetch';

// Create elevated versions of secrets functions
const elevatedGetSecretValue = elevate(secrets.getSecretValue);
const country = "GB"

function modelTableReservation(payload) {
  try {
    // Extract order related data as strings
    var reservationInfo = {
        reservationId:String(payload.reservationId || ""),
        orderId: String(payload.orderId || ""),
        orderNumber: String(payload.orderNumber || ""),
        reservationURL: String(payload.reservationURL || ""),
        viewOrderURL: String(payload.viewOrderUrl || ""),
        siteURL: String(payload.siteURL || ""),
        businessManagerReservationURL: String(payload.businessManagerReservationURL || ""),
        paymentStatus: String(payload.paymentStatus || ""),
        startDate:String(payload.startDate||""),
        startTime:String(payload.startTime || ""),
        startDateTime: String(payload.startDateTime || ""),
        endTime: String(payload.endTime || ""),
        experienceName:String(payload.experienceName|| ""),
        partySize: String(payload.partySize ||""),

        totalAmount: String(payload.priceSummary?.totalAmount || ""),
        totalFormattedAmount: String(payload.priceSummary?.totalFormattedAmount || ""),
        taxAmount: String(payload.priceSummary?.taxAmount || ""),
        taxFormattedAmount: String(payload.priceSummary?.taxFormattedAmount || ""),
        discountAmount: String(payload.priceSummary?.discountAmount || ""),
        discountFormattedAmount: String(payload.priceSummary?.discountFormattedAmount || ""),
    };

    const businessInfo = {
      restaurantName: String(payload?.restaurantName || ""),
      locationName: String(payload?.locationName ||""),
      locationEmail: String(payload?.locationEmail || ""),
      locationPhone: String(payload?.locationPhone || ""),
      locationFax: String(payload?.locationFax || ""),
      locationAddress: String(payload?.locationAddress || ""),
      locationDescription: String(payload?.locationDescription || ""),
    }

    const recipient = String(payload.guestPhone || payload.contact?.phone || "")

    const firstName = payload.guestFirstName || payload.contact?.name?.first || "";
    const lastName = payload.guestLastName || payload.contact?.name?.last || "";
    const customerName = [firstName, lastName].filter(Boolean).join(" ");
    var customerInfo = {
      firstName: firstName,
      lastName: lastName,
      customerName: customerName,
      phoneNumber: recipient,
      email: String(payload.guestEmail || payload.contact?.email || ""),
    };
    return { reservationInfo, businessInfo, customerInfo, recipient};
  } 
  catch (e) {
    console.error(`Error in modelTableReservation: ${e}`);
    return { reservationInfo:null, businessInfo:null, customerInfo:null, recipient:null};
  }
}


/**
 * Autocomplete function declaration, do not delete
 * @param {import('./__schema__.js').Payload} options
 */
export const invoke = async ({ payload }) => {
  try {
    // Get bearer token securely with elevation
    const {value: bearerToken} = await elevatedGetSecretValue('MERCURI_MESSAGING_API_KEY');
    
    const { reservationInfo, businessInfo, customerInfo, recipient} = modelTableReservation(payload)
    if (!recipient) {
      console.error('Recipient phone number missing.');
      return {};
    }

    const apiPayload = {
      phoneNumberId: "xxxxxxxxxxxxxxxxxxx",
      channel: "whatsapp",
      recipient: recipient,
      message: {
        type: "template",
        template: {
          templateId: "xxxxxxxxxxxxxxxxxxx",
          parameters: [
            reservationInfo,
            businessInfo,
            customerInfo
          ]
        }
      },
      country:country,
      saveToInbox: true
    };

    // Call Mercuri API
    const response = await fetch('https://api.mercuri.cx/v1/send_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`Mercuri API error: ${response.status} - ${errorMsg}`);
    } else {
      const respData = await response.json();
      console.log('Message sent successfully:', respData);
    }
  } catch (error) {
    console.error('Error in invoke:', error);
  }

  return {};
};
