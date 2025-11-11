import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import { fetch } from 'wix-fetch';

// Create elevated versions of secrets functions
const elevatedGetSecretValue = elevate(secrets.getSecretValue);
const country = "GB" // or "US" or "CA" or "IN"


// Helper to stringify an address object into a formatted string
function addressToString(addr) {
  if (!addr || typeof addr !== "object") return "";
  // Join relevant address parts separated by commas, ignoring empty parts
  return [
    addr.streetNumber || "",
    addr.street || addr.addressLine || addr.formattedAddressLine || "",
    addr.city || "",
    addr.subdivision || addr.subdivisionFullname || addr.state || "",
    addr.zip || addr.postalCode || "",
    addr.country || addr.countryFullname || ""
  ].filter(Boolean).join(", ");
}


function modelRestaurantOrder(payload) {
  try {
    // Extract order related data as strings
    var orderInfo = {
      orderId: String(payload.orderId || ""),
      orderNumber: String(payload.orderNumber || ""),
      orderURL: String(payload.viewOrderUrl || ""),
      trackerURL: String(payload.trackerUrl || ""),
      lineItems:payload.lineItems || [],
      fulfillmentStatus: String(payload.fulfillmentStatus || ""),
      fulfillmentMethod: String((payload.fulfillmentMethod === 'Pickup' || payload.fulfillmentMethod === "PICKUP") ? "PICKUP" : "DELIVERY"),
      paymentStatus: String(payload.paymentStatus || ""),
      pickupInstructions: String(payload.pickupInstructions || ""),
      totalAmount: String(payload.priceSummary?.totalAmount || ""),
      totalFormattedAmount: String(payload.priceSummary?.totalFormattedAmount || ""),
      shippingAmount: String(payload.priceSummary?.shippingAmount || ""),
      shippingFormattedAmount: String(payload.priceSummary?.shippingFormattedAmount || ""),
      discountAmount: String(payload.priceSummary?.discountAmount || ""),
      discountFormattedAmount: String(payload.priceSummary?.discountFormattedAmount || ""),
      buyerNote: String(payload.buyerNote || ""),
      orderReadyTime: String(payload.orderReadyTime || ""),
      deliveryTime: String(payload.deliveryTime || ""),
      pickupAddress: addressToString(payload?.pickupAddress || {}),
      deliveryAddress: addressToString(payload.deliveryAddress || {}),
      customerAddress: addressToString(payload.customerDetails?.address || payload.contact?.address),
    };

    const businessInfo = {
      businessName: String(payload?.businessName || ""),
      businessPhoneNumber: String(payload?.businessPhoneNumber || ""),
      businessEmail: String(payload?.businessEmail || ""),
      businessAddress: String(payload?.businessAddress?.googleFormattedAddress || ""),
      businessTimeZone: String(payload?.businessTimeZone || ""),
      businessLocationName: String(payload?.businessLocation?.name || "")
    }

    const recipient = String(payload.phone || payload.customerDetails?.phone || payload.contact?.phone || "")

    // Extract customer info as strings
    var customerInfo = {
      firstName: String(payload.customerDetails?.firstName || payload.contact?.name?.first || ""),
      lastName: String(payload.customerDetails?.lastName || payload.contact?.name?.last || ""),
      customerName: ((payload.customerDetails?.firstName || "") + " " + (payload.customerDetails?.lastName || "")).trim(),
      phoneNumber: recipient,
      email: String(payload.customerDetails?.email || payload.contact?.email || ""),
      company: String(payload.customerDetails?.company || payload.contact?.company || ""),
    };
    return { orderInfo, businessInfo, customerInfo, recipient};
  } 
  catch (e) {
    console.error(`Error in modelRestaurantOrder: ${e}`);
    return { orderInfo:null, businessInfo:null, customerInfo:null, recipient:null};
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
    
    const { orderInfo, businessInfo, customerInfo, recipient} = modelRestaurantOrder(payload)
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
            orderInfo,
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
