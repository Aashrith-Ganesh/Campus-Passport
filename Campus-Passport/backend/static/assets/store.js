/**
 * Campus Passport — State & Authentication Store
 * Manages active user persona, authentication state, and event dispatching.
 */

class Store {
  constructor() {
    this.listeners = new Map();
    this.currentUser = this.loadUser();
    this.students = [];
    this.activeStudent = null;
  }

  loadUser() {
    try {
      const raw = localStorage.getItem("cp_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated() {
    return Boolean(this.currentUser && this.currentUser.id && this.currentUser.role);
  }

  isStudent() {
    return this.isAuthenticated() && this.currentUser.role === "STUDENT";
  }

  isTeacher() {
    return this.isAuthenticated() && this.currentUser.role === "TEACHER";
  }

  isAdmin() {
    return this.isAuthenticated() && this.currentUser.role === "ADMIN";
  }

  isMerchant() {
    return this.isAuthenticated() && this.currentUser.role === "MERCHANT";
  }

  getStudentId() {
    if (this.isStudent()) return this.currentUser.id;
    if (this.activeStudent) return this.activeStudent.id;
    return null;
  }

  login(user) {
    let defaultName = "Campus User";
    let defaultClass = "";
    if (user.role === "STUDENT") {
      defaultName = "Aarav Sharma";
      defaultClass = "10-A";
    } else if (user.role === "TEACHER") {
      defaultName = "Priya Sharma";
      defaultClass = "Faculty";
    } else if (user.role === "ADMIN") {
      defaultName = "Dr. Arvind Rao";
      defaultClass = "Administration";
    } else if (user.role === "MERCHANT") {
      defaultName = "Campus Canteen";
      defaultClass = "Merchant Terminal";
    }

    this.currentUser = {
      id: user.id,
      role: user.role,
      name: user.name || defaultName,
      class_name: user.class_name || defaultClass,
      preferred_language: user.preferred_language || "English",
    };
    try {
      localStorage.setItem("cp_user", JSON.stringify(this.currentUser));
    } catch {}
    this.emit("authChanged", this.currentUser);
  }

  logout() {
    this.currentUser = null;
    this.activeStudent = null;
    try {
      localStorage.removeItem("cp_user");
    } catch {}
    this.emit("authChanged", null);
  }

  setActiveStudent(student) {
    this.activeStudent = student;
    this.emit("studentChanged", student);
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(payload);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      }
    }
  }
}

export const store = new Store();
