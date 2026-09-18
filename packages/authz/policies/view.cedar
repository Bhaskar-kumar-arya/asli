permit (principal, action in [Asli::Action::"ViewCabinet", Asli::Action::"ReceiveAlerts"], resource)
when { principal in resource.owners || principal in resource.editors || principal in resource.viewers };
