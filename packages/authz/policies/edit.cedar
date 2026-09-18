permit (principal, action in [Asli::Action::"AddMedicine", Asli::Action::"RemoveMedicine"], resource)
when { principal in resource.owners || principal in resource.editors };
