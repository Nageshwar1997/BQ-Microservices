export interface IContactAcknowledgementData {
  ticketId: string;
  queryType: string;
}

export interface IContactAdminNotificationData extends IContactAcknowledgementData {
  name: string;
  email: string;
  phoneNumber?: string;
  message: string;
}
