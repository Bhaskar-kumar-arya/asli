permit (principal, action == Asli::Action::"ManageMembers", resource)
when { principal in resource.owners };
