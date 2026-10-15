package com.omnicharge.pos.nfc

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class PaymentRequestHostApduService : HostApduService() {
  private var applicationSelected = false

  override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray {
    if (commandApdu.size >= 5 &&
      commandApdu[0] == 0x00.toByte() &&
      commandApdu[1] == 0xA4.toByte() &&
      commandApdu[2] == 0x04.toByte() &&
      commandApdu[3] == 0x00.toByte()
    ) {
      val aidLength = commandApdu[4].toInt() and 0xFF
      val selectedAid = commandApdu.copyOfRange(5, minOf(5 + aidLength, commandApdu.size))
      applicationSelected = selectedAid.contentEquals(PAYMENT_REQUEST_AID)
      return if (applicationSelected) SUCCESS else FILE_NOT_FOUND
    }

    if (applicationSelected && commandApdu.contentEquals(READ_REQUEST_COMMAND)) {
      val requestId = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
        .getString(REQUEST_ID_KEY, null)
      if (requestId.isNullOrBlank()) return FILE_NOT_FOUND
      return requestId.toByteArray(Charsets.US_ASCII) + SUCCESS
    }

    return FILE_NOT_FOUND
  }

  override fun onDeactivated(reason: Int) {
    applicationSelected = false
  }

  companion object {
    private const val PREFERENCES = "omnicharge_pos_nfc"
    private const val REQUEST_ID_KEY = "payment_request_id"
    private val PAYMENT_REQUEST_AID = byteArrayOf(0xF0.toByte(), 0x01, 0x02, 0x03, 0x04, 0x05, 0x06)
    private val READ_REQUEST_COMMAND = byteArrayOf(0x80.toByte(), 0xCA.toByte(), 0x00, 0x00, 0x00)
    private val SUCCESS = byteArrayOf(0x90.toByte(), 0x00)
    private val FILE_NOT_FOUND = byteArrayOf(0x6A, 0x82)
  }
}
