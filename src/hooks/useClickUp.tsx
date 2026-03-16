import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClickUpTeam {
  id: string;
  name: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
}

interface ClickUpFolder {
  id: string;
  name: string;
}

interface ClickUpList {
  id: string;
  name: string;
}

interface ClickUpMember {
  id: number;
  username: string;
  email: string;
  initials: string;
  profilePicture: string | null;
}

async function callClickUp(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("clickup-proxy", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useClickUp() {
  const [teams, setTeams] = useState<ClickUpTeam[]>([]);
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([]);
  const [folders, setFolders] = useState<ClickUpFolder[]>([]);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [members, setMembers] = useState<ClickUpMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("get_teams");
      const mapped = (data.teams || []).map((t: any) => ({ id: t.id, name: t.name }));
      setTeams(mapped);
      return mapped;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpaces = useCallback(async (teamId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("get_spaces", { team_id: teamId });
      const mapped = (data.spaces || []).map((s: any) => ({ id: s.id, name: s.name }));
      setSpaces(mapped);
      setFolders([]);
      setLists([]);
      setMembers([]);
      return mapped;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFolders = useCallback(async (spaceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("get_folders", { space_id: spaceId });
      const mapped = (data.folders || []).map((f: any) => ({ id: f.id, name: f.name }));
      setFolders(mapped);
      setLists([]);
      setMembers([]);
      return mapped;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLists = useCallback(async (spaceId: string, folderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("get_lists", { space_id: spaceId, folder_id: folderId });
      const mapped = (data.lists || []).map((l: any) => ({ id: l.id, name: l.name }));
      setLists(mapped);
      setMembers([]);
      return mapped;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (listId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("get_members", { list_id: listId });
      const mapped = (data.members || []).map((m: any) => ({
        id: m.id,
        username: m.username,
        email: m.email,
        initials: m.initials,
        profilePicture: m.profilePicture,
      }));
      setMembers(mapped);
      return mapped;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (params: {
    list_id: string;
    name: string;
    description: string;
    priority?: number;
    assignees?: number[];
    due_date?: number;
    tags?: string[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callClickUp("create_task", params);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    teams, spaces, folders, lists, members,
    loading, error,
    fetchTeams, fetchSpaces, fetchFolders, fetchLists, fetchMembers,
    createTask,
  };
}
