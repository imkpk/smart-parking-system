package com.smartparking.payment.docs;

public final class PaymentApiDocs {
    public static final String TAG = "Payments";
    public static final String TAG_DESCRIPTION = "Payment lifecycle and reporting APIs";

    public static final String HEALTH_SUMMARY = "Payment service health check";
    public static final String INITIATE_SUMMARY = "Initiate a payment";
    public static final String INITIATE_DESCRIPTION = "Creates a new INITIATED payment record.";
    public static final String MOCK_SUCCESS_SUMMARY = "Mark payment as mock success";
    public static final String MOCK_SUCCESS_DESCRIPTION =
            "Marks an INITIATED payment as SUCCESS and generates a provider reference.";
    public static final String MOCK_FAILURE_SUMMARY = "Mark payment as mock failure";
    public static final String MOCK_FAILURE_DESCRIPTION =
            "Marks an INITIATED payment as FAILED and stores a failure reason.";
    public static final String FIND_BY_ID_SUMMARY = "Get payment by id";
    public static final String FIND_BY_USER_SUMMARY = "Get payments by user id";
    public static final String SUMMARY_REPORT_SUMMARY = "Get payment summary report";

    public static final String PAYMENT_ID_EXAMPLE = "1";
    public static final String USER_ID_EXAMPLE = "1";

    public static final String INITIATE_EXAMPLE = """
            {
              "parkingEventId": 1,
              "bookingId": 1,
              "userId": 1,
              "amount": 80,
              "currency": "INR",
              "paymentMethod": "MOCK"
            }
            """;

    private PaymentApiDocs() {
    }
}
