package app.monolith.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.monolith.android.MainModel
import app.monolith.android.R
import app.monolith.android.data.*
import app.monolith.android.editor.EditorScreen
import org.json.JSONObject

data class Destination(val id: String, val icon: ImageVector)

val destinations =
    listOf(
        Destination("home", Icons.Outlined.SpaceDashboard),
        Destination("actions", Icons.Outlined.CheckCircleOutline),
        Destination("calendar", Icons.Outlined.CalendarToday),
        Destination("projects", Icons.Outlined.ViewKanban),
        Destination("docs", Icons.Outlined.Description),
        Destination("journal", Icons.Outlined.AutoStories),
        Destination("rooms", Icons.Outlined.Forum),
        Destination("databases", Icons.Outlined.TableChart),
        Destination("atlas", Icons.Outlined.Hub),
        Destination("automations", Icons.Outlined.AccountTree),
        Destination("agents", Icons.Outlined.SmartToy),
        Destination("redraw", Icons.Outlined.Draw),
        Destination("gym", Icons.Outlined.FitnessCenter),
        Destination("tech_lab", Icons.Outlined.Dns),
        Destination("urpg", Icons.Outlined.AutoAwesome),
    )

@Composable
fun CompanionApp(model: MainModel) {
    val systemDark = isSystemInDarkTheme()
    MonolithTheme(
        if (model.preferences.has("dark")) model.preferences.optBoolean("dark") else systemDark,
        model.preferences.optBoolean("reduced_motion"),
    ) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            if (!model.connected) Onboarding(model) else WorkspaceShell(model)
        }
    }
}

@Composable
fun Onboarding(model: MainModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    Column(
        Modifier.fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(28.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Image(painterResource(R.drawable.ic_monolith), null, Modifier.size(42.dp))
            Text("monolith", fontWeight = FontWeight.SemiBold, fontSize = 20.sp)
        }
        Spacer(Modifier.height(32.dp))
        Text(
            tr(if (model.discovered) "sign_in" else "welcome"),
            fontSize = 44.sp,
            lineHeight = 48.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = (-2).sp,
        )
        Text(
            tr("connect_description"),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        MonoCard {
            if (!model.discovered)
                OutlinedTextField(
                    model.server,
                    { model.server = it },
                    Modifier.fillMaxWidth(),
                    label = { Text(tr("server")) },
                    placeholder = { Text("monolith.example.ts.net") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    singleLine = true,
                )
            else if (model.challenge.isNotBlank())
                OutlinedTextField(
                    code,
                    { code = it.filter(Char::isDigit).take(6) },
                    Modifier.fillMaxWidth(),
                    label = { Text(tr("authenticator")) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                )
            else {
                Caption(model.server)
                OutlinedTextField(
                    email,
                    { email = it },
                    Modifier.fillMaxWidth(),
                    label = { Text(tr("email")) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                )
                OutlinedTextField(
                    password,
                    { password = it },
                    Modifier.fillMaxWidth(),
                    label = { Text(tr("password")) },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                )
            }
            if (model.error.isNotBlank()) ErrorBanner(model.error, model::dismissError)
            Action(
                if (model.busy) "loading" else if (model.discovered) "sign_in" else "connect",
                Icons.Outlined.ArrowForward,
                enabled = !model.busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (model.discovered) {
                    model.signIn(email, password, code)
                    password = ""
                    code = ""
                } else model.connect()
            }
            if (model.discovered)
                TextButton(model::changeServer, enabled = !model.busy) { Text(tr("change_server")) }
        }
        Spacer(Modifier.weight(1f))
        Caption(tr("companion"))
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun WorkspaceShell(model: MainModel) {
    val availableDestinations = destinations.filter {
        it.id !in setOf("atlas", "automations", "agents", "redraw", "gym", "tech_lab") ||
            it.id.replace('_', '-') in model.availableAddons
    }
    var explore by remember { mutableStateOf(false) }
    var switcher by remember { mutableStateOf(false) }
    val wide =
        with(androidx.compose.ui.platform.LocalDensity.current) {
            androidx.compose.ui.platform.LocalWindowInfo.current.containerSize.width.toDp() >=
                720.dp
        }
    val reducedMotion = LocalReducedMotion.current
    BackHandler(
        model.form != null ||
            model.editor != null ||
            model.section != "home" ||
            model.selectedBase != null ||
            model.selectedRoom != null ||
            model.selectedProject != null
    ) {
        model.back()
    }
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            Column(Modifier.statusBarsPadding()) {
                Row(
                    Modifier.fillMaxWidth()
                        .padding(start = 20.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (
                        model.editor != null ||
                            model.selectedBase != null ||
                            model.selectedRoom != null ||
                            model.selectedProject != null
                    )
                        IconAction("back", Icons.Outlined.ArrowBack) { model.back() }
                    Column(Modifier.weight(1f).clickable { switcher = true }) {
                        Caption("MONOLITH / ${tr("companion").substringBefore('.')}")
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                model.workspace?.str("name") ?: tr("workspace"),
                                fontWeight = FontWeight.SemiBold,
                            )
                            Icon(Icons.Outlined.ExpandMore, tr("workspaces"), Modifier.size(18.dp))
                        }
                    }
                    IconAction("search", Icons.Outlined.Search) { model.navigate("search") }
                    IconAction("settings", Icons.Outlined.Tune) { model.navigate("settings") }
                }
                if (model.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (model.stale)
                    Text(
                        tr("offline"),
                        Modifier.fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(10.dp),
                        style = MaterialTheme.typography.labelMedium,
                    )
            }
        },
        bottomBar = {
            if (!wide && model.editor == null)
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                ) {
                    listOf("home", "actions", "calendar", "docs", "more").forEach { key ->
                        val icon =
                            destinations.firstOrNull { it.id == key }?.icon ?: Icons.Outlined.Apps
                        NavigationBarItem(
                            model.section == key,
                            onClick = {
                                if (key == "more") explore = true else model.navigate(key)
                            },
                            icon = { Icon(icon, null, Modifier.size(21.dp)) },
                            label = { Text(tr(key), fontSize = 11.sp) },
                            colors =
                                NavigationBarItemDefaults.colors(
                                    indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                                ),
                        )
                    }
                }
        },
    ) { inset ->
        Row(Modifier.fillMaxSize().padding(inset).consumeWindowInsets(inset)) {
            if (wide)
                LazyColumn(
                    Modifier.width(200.dp).padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(availableDestinations) { dest ->
                        TextButton(
                            { model.navigate(dest.id) },
                            Modifier.fillMaxWidth(),
                            colors =
                                ButtonDefaults.textButtonColors(
                                    containerColor =
                                        if (model.section == dest.id)
                                            MaterialTheme.colorScheme.surfaceVariant
                                        else androidx.compose.ui.graphics.Color.Transparent
                                ),
                        ) {
                            Icon(dest.icon, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(tr(dest.id), Modifier.weight(1f))
                        }
                    }
                }
            Column(Modifier.weight(1f).fillMaxHeight()) {
                if (model.error.isNotBlank() && model.form == null)
                    Box(Modifier.padding(12.dp)) { ErrorBanner(model.error, model::dismissError) }
                if (model.workspace == null)
                    Column(Modifier.padding(24.dp)) {
                        EmptyState("workspaces")
                        Action("new_workspace", Icons.Outlined.Add) {
                            model.form("databases:workspaces/create", title = "new_workspace")
                        }
                    }
                else if (model.editor != null) EditorScreen(model)
                else
                    AnimatedContent(
                        model.section,
                        transitionSpec = {
                            val duration = if (reducedMotion) 0 else 160
                            fadeIn(tween(duration)) togetherWith fadeOut(tween(duration))
                        },
                        label = "section",
                    ) { section ->
                        when (section) {
                            "home",
                            "dashboard" -> HomeScreen(model)
                            "actions",
                            "projects",
                            "journal",
                            "databases" -> RecordsScreen(model)
                            "calendar" -> CalendarScreen(model)
                            "docs" -> PagesScreen(model)
                            "rooms" -> RoomsScreen(model)
                            "search" -> SearchScreen(model)
                            "settings" -> SettingsScreen(model)
                            else ->
                                if (section.startsWith("redraw_editor:"))
                                    DrawingScreen(model, section.substringAfter(':'))
                                else AddonScreen(model, section)
                        }
                    }
            }
        }
    }
    if (explore)
        ModalBottomSheet(
            onDismissRequest = { explore = false },
            containerColor = MaterialTheme.colorScheme.background,
        ) {
            LazyColumn(
                Modifier.padding(horizontal = 20.dp).navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                item {
                    Text(
                        tr("more"),
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.padding(bottom = 16.dp),
                    )
                }
                items(availableDestinations.chunked(2)) { row ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(bottom = 10.dp),
                    ) {
                        row.forEach { dest ->
                            MonoCard(
                                Modifier.weight(1f),
                                onClick = {
                                    model.navigate(dest.id)
                                    explore = false
                                },
                            ) {
                                Icon(dest.icon, null, Modifier.size(23.dp))
                                Text(tr(dest.id), fontWeight = FontWeight.Medium)
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    if (switcher)
        ModalBottomSheet(onDismissRequest = { switcher = false }) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(tr("workspaces"), style = MaterialTheme.typography.titleLarge)
                model.workspaces.forEach { workspace ->
                    ListItem(
                        headlineContent = { Text(workspace.str("name")) },
                        supportingContent = { Caption(tr(workspace.str("role"))) },
                        trailingContent = {
                            if (model.workspaceId == workspace.str("id"))
                                Icon(Icons.Outlined.Check, null)
                        },
                        modifier =
                            Modifier.clickable {
                                model.selectWorkspace(workspace)
                                switcher = false
                            },
                    )
                }
                Action("new_workspace", Icons.Outlined.Add, secondary = true) {
                    switcher = false
                    model.form("databases:workspaces/create", title = "new_workspace")
                }
            }
        }
    OperationSheet(model)
    model.operationResult?.let { result ->
        if (result is JSONObject || result is org.json.JSONArray)
            ModalBottomSheet(onDismissRequest = { model.operationResult = null }) {
                LazyColumn(contentPadding = PaddingValues(20.dp)) {
                    item {
                        Text(tr("details"), style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(16.dp))
                        NativeValue(result)
                    }
                }
            }
    }
}
