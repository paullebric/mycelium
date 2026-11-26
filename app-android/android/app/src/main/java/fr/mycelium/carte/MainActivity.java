package fr.mycelium.carte;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Affichage bord à bord explicite (Android 15+ l'impose, et rétrocompatible avant) :
        // Capacitor (SystemBars) transmet ensuite les marges des barres système à la page (env(safe-area-inset-*)).
        // APRÈS super.onCreate : Capacitor y remplace le thème de l'écran de démarrage par celui de l'app.
        // Appelé avant, la fenêtre se construisait avec le thème de démarrage (barre de titre + logo en haut).
        super.onCreate(savedInstanceState);
        // barres transparentes, icônes claires (fond de l'app sombre), quel que soit le thème du téléphone
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    }
}
