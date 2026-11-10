package app.monolith.android.ui

import android.provider.Settings
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import app.monolith.android.R

val LocalReducedMotion = staticCompositionLocalOf { false }
val LocalStrings = staticCompositionLocalOf<(String) -> String> { { it } }

@Composable fun tr(key: String): String = LocalStrings.current(key)

fun readable(key: String) =
    key.substringAfterLast('/')
        .replace(Regex("([a-z])([A-Z])"), "$1 $2")
        .replace('_', ' ')
        .replaceFirstChar { it.uppercase() }

@Composable
fun MonolithTheme(
    dark: Boolean = isSystemInDarkTheme(),
    reduced: Boolean = false,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val resources = LocalResources.current
    SideEffect {
        (context as? android.app.Activity)?.let { activity ->
            WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
        }
    }
    val inter = FontFamily(Font(R.font.inter))
    val mono = FontFamily(Font(R.font.jetbrains_mono))
    val motionOff = remember {
        Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        ) == 0f
    }
    val colors =
        if (dark)
            darkColorScheme(
                primary = Color(0xffe8e7e3),
                onPrimary = Color(0xff171717),
                background = Color(0xff111110),
                surface = Color(0xff1c1c1a),
                onSurface = Color(0xffedede9),
                surfaceVariant = Color(0xff292927),
                onSurfaceVariant = Color(0xffaeaea7),
                outlineVariant = Color(0xff353532),
                error = Color(0xffffb4ab),
            )
        else
            lightColorScheme(
                primary = Color(0xff242422),
                onPrimary = Color.White,
                background = Color(0xfff6f5f1),
                surface = Color(0xfffffefa),
                onSurface = Color(0xff242422),
                surfaceVariant = Color(0xffeeede8),
                onSurfaceVariant = Color(0xff73736d),
                outlineVariant = Color(0xffdeded6),
                error = Color(0xffa32929),
            )
    val resolver: (String) -> String = { key ->
        val id = stringResources[key] ?: 0
        if (id != 0) resources.getString(id) else readable(key)
    }
    CompositionLocalProvider(
        LocalReducedMotion provides (reduced || motionOff),
        LocalStrings provides resolver,
    ) {
        MaterialTheme(
            colorScheme = colors,
            shapes =
                Shapes(
                    small = RoundedCornerShape(8.dp),
                    medium = RoundedCornerShape(12.dp),
                    large = RoundedCornerShape(20.dp),
                ),
            typography =
                Typography(
                    titleLarge =
                        androidx.compose.ui.text.TextStyle(
                            fontFamily = inter,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = (-0.8).sp,
                        ),
                    titleMedium =
                        androidx.compose.ui.text.TextStyle(
                            fontFamily = inter,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                        ),
                    bodyLarge =
                        androidx.compose.ui.text.TextStyle(
                            fontFamily = inter,
                            fontSize = 16.sp,
                            lineHeight = 24.sp,
                        ),
                    bodyMedium =
                        androidx.compose.ui.text.TextStyle(
                            fontFamily = inter,
                            fontSize = 14.sp,
                            lineHeight = 21.sp,
                        ),
                    labelSmall =
                        androidx.compose.ui.text.TextStyle(fontSize = 11.sp, fontFamily = mono),
                ),
            content = content,
        )
    }
}

@Composable
fun MonoCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val reduced = LocalReducedMotion.current
    val scale by
        animateFloatAsState(
            if (pressed && !reduced) .976f else 1f,
            spring(dampingRatio = .63f, stiffness = 420f),
            label = "card compression",
        )
    val tilt by
        animateFloatAsState(
            if (pressed && !reduced) -.7f else 0f,
            spring(dampingRatio = .58f, stiffness = 280f),
            label = "card wobble",
        )
    val haptic = LocalHapticFeedback.current
    Surface(
        modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                rotationZ = tilt
            }
            .clip(RoundedCornerShape(16.dp))
            .then(
                if (onClick != null)
                    Modifier.clickable(interactionSource = source, indication = null) {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onClick()
                    }
                else Modifier
            ),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = content,
        )
    }
}

@Composable
fun Action(
    text: String,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    secondary: Boolean = false,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val label = tr(text)
    if (secondary)
        OutlinedButton(
            onClick,
            modifier.heightIn(min = 48.dp),
            enabled,
            shape = RoundedCornerShape(10.dp),
        ) {
            icon?.let {
                Icon(it, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(label)
        }
    else
        Button(
            onClick,
            modifier.heightIn(min = 48.dp),
            enabled,
            shape = RoundedCornerShape(10.dp),
        ) {
            icon?.let {
                Icon(it, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(label)
        }
}

@Composable
fun IconAction(key: String, icon: ImageVector, enabled: Boolean = true, action: () -> Unit) {
    IconButton(action, Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp), enabled = enabled) {
        Icon(icon, tr(key), Modifier.size(21.dp))
    }
}

@Composable
fun Caption(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
fun EmptyState(
    title: String,
    description: String = "empty_description",
    icon: ImageVector = Icons.Outlined.Inbox,
) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 40.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, null, Modifier.size(36.dp), MaterialTheme.colorScheme.onSurfaceVariant)
        Text(tr(title), style = MaterialTheme.typography.titleMedium)
        Text(tr(description), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun ErrorBanner(error: String, onDismiss: () -> Unit = {}) {
    Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(12.dp)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(error, Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
            IconAction("close", Icons.Outlined.Close, action = onDismiss)
        }
    }
}
