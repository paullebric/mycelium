package fr.mycelium.carte;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Affichage bord à bord explicite (Android 15+ l'impose, et rétrocompatible avant) :
        // Capacitor (SystemBars) transmet ensuite les marges des barres système à la page (env(safe-area-inset-*)).
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
