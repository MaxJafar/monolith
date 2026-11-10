package app.monolith.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import app.monolith.android.ui.CompanionApp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private lateinit var model: MainModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        model = ViewModelProvider(this)[MainModel::class.java]
        acceptShare(intent)
        setContent { CompanionApp(model) }
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) { model.syncWhileVisible() }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        acceptShare(intent)
    }

    private fun acceptShare(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain")
            model.sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)?.take(100000).orEmpty()
    }
}
