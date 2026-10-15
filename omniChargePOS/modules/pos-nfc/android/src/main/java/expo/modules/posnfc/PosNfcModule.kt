package expo.modules.posnfc

import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PosNfcModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PosNfc")

    Function("isHostCardEmulationAvailable") {
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("Android application context is unavailable")
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    }

    Function("setPaymentRequestId") { requestId: String ->
      require(Regex("^[0-9a-fA-F-]{36}$").matches(requestId)) { "Invalid payment request ID" }
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("Android application context is unavailable")
      context.getSharedPreferences("omnicharge_pos_nfc", Context.MODE_PRIVATE)
        .edit()
        .putString("payment_request_id", requestId)
        .apply()
      true
    }

    Function("clearPaymentRequestId") {
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("Android application context is unavailable")
      context.getSharedPreferences("omnicharge_pos_nfc", Context.MODE_PRIVATE)
        .edit()
        .remove("payment_request_id")
        .apply()
    }
  }
}
