(() => {
  'use strict';

  const config = window.CLEANEATS_CONFIG;
  const draftKey = 'cleaneats.registration-draft';
  const pendingKey = 'cleaneats.pending-profile';
  const sessionKey = 'cleaneats.session';
  const page = location.pathname.split('/').pop();

  const readJson = (storage, key, fallback = null) => {
    try {
      return JSON.parse(storage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeJson = (storage, key, value) => storage.setItem(key, JSON.stringify(value));
  const draft = () => readJson(sessionStorage, draftKey, {});
  const saveDraft = (values) => writeJson(sessionStorage, draftKey, { ...draft(), ...values });
  const value = (element) => element?.value?.trim() ?? '';
  const selectedText = (element) => element?.selectedOptions?.[0]?.textContent?.trim() ?? '';
  const selectedLabels = (selector) =>
    [...document.querySelectorAll(selector)].map((item) => item.textContent.trim());

  function setBusy(action, busy, label = 'Processando...') {
    if (!action) return;
    if (busy) {
      action.dataset.originalText = action.textContent.trim();
      action.textContent = label;
      action.setAttribute('aria-disabled', 'true');
      action.style.pointerEvents = 'none';
    } else {
      action.textContent = action.dataset.originalText || action.textContent;
      action.removeAttribute('aria-disabled');
      action.style.pointerEvents = '';
    }
  }

  function messageHost(action) {
    let host = document.getElementById('form-message');
    if (!host) {
      host = document.createElement('div');
      host.id = 'form-message';
      host.setAttribute('role', 'alert');
      host.style.cssText =
        'display:none;margin:16px 0;padding:14px 16px;border-radius:12px;font:600 14px/1.45 "Plus Jakarta Sans",sans-serif;';
      action?.parentElement?.insertBefore(host, action);
    }
    return host;
  }

  function showMessage(action, text, kind = 'error') {
    const host = messageHost(action);
    host.textContent = text;
    host.style.display = 'block';
    host.style.background = kind === 'success' ? '#E8F5D8' : '#FDECEC';
    host.style.color = kind === 'success' ? '#2D6A1F' : '#9B2C2C';
    host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearMessage() {
    const host = document.getElementById('form-message');
    if (host) host.style.display = 'none';
  }

  function requireFields(fields) {
    for (const [element, label] of fields) {
      if (!value(element)) {
        element?.focus();
        throw new Error(`Preencha ${label}.`);
      }
    }
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function supabaseRequest(path, body) {
    if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
      throw new Error('Configure a URL e a chave pública do Supabase em runtime-config.js.');
    }
    const response = await fetch(`${config.supabaseUrl}/auth/v1${path}`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.msg || data.message || data.error_description || 'Não foi possível autenticar.');
    }
    return data;
  }

  async function completeProfile(accessToken, profile) {
    const response = await fetch(`${config.apiUrl}/profiles/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'A conta foi criada, mas não foi possível concluir o perfil.');
    }
  }

  async function finishRegistration(action, profileData) {
    clearMessage();
    const account = draft();
    if (!account.email || !account.password || !account.tipoPerfil) {
      location.href = '03-cadastro-etapa1.html';
      return;
    }
    const payload = {
      nome: account.nome,
      sobrenome: account.sobrenome,
      email: account.email,
      tipoPerfil: account.tipoPerfil,
      cliente: account.tipoPerfil === 'CLIENTE' ? profileData : null,
      nutricionista: account.tipoPerfil === 'NUTRICIONISTA' ? profileData : null,
      restaurante: account.tipoPerfil === 'RESTAURANTE' ? profileData : null,
    };
    setBusy(action, true, 'Criando sua conta...');
    try {
      const auth = await supabaseRequest('/signup', {
        email: account.email,
        password: account.password,
        data: { nome: account.nome, sobrenome: account.sobrenome },
      });
      const token = auth.access_token;
      if (!token) {
        writeJson(localStorage, pendingKey, payload);
        sessionStorage.removeItem(draftKey);
        showMessage(
          action,
          'Conta criada. Confirme o email e depois faça login para concluir seu perfil.',
          'success',
        );
        return;
      }
      await completeProfile(token, payload);
      localStorage.removeItem(pendingKey);
      sessionStorage.removeItem(draftKey);
      writeJson(sessionStorage, sessionKey, { accessToken: token, user: auth.user });
      showMessage(action, 'Cadastro concluído com sucesso.', 'success');
      setTimeout(() => {
        location.href = '01-splash.html';
      }, 700);
    } catch (error) {
      showMessage(action, error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setBusy(action, false);
    }
  }

  function setupLogin() {
    const inputs = document.querySelectorAll('.field-input');
    const email = inputs[0];
    const password = inputs[1];
    const remember = document.querySelector('.remember .checkbox');
    const action = document.querySelector('.btn-submit');
    document.querySelector('.remember')?.addEventListener('click', () => remember?.classList.toggle('checked'));
    document.querySelector('.field-pw-toggle')?.addEventListener('click', () => {
      password.type = password.type === 'password' ? 'text' : 'password';
    });
    document.querySelectorAll('.btn-social').forEach((button) => {
      button.addEventListener('click', () => showMessage(action, 'Este provedor social ainda não está configurado.'));
    });
    action?.addEventListener('click', async (event) => {
      event.preventDefault();
      clearMessage();
      try {
        requireFields([[email, 'seu email'], [password, 'sua senha']]);
        if (!validEmail(value(email))) throw new Error('Informe um email válido.');
        setBusy(action, true, 'Entrando...');
        const auth = await supabaseRequest('/token?grant_type=password', {
          email: value(email),
          password: value(password),
        });
        const storage = remember?.classList.contains('checked') ? localStorage : sessionStorage;
        writeJson(storage, sessionKey, { accessToken: auth.access_token, user: auth.user });
        const pending = readJson(localStorage, pendingKey);
        if (pending && pending.email?.toLowerCase() === value(email).toLowerCase()) {
          await completeProfile(auth.access_token, pending);
          localStorage.removeItem(pendingKey);
        }
        const response = await fetch(`${config.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        });
        if (!response.ok) throw new Error('Conta autenticada, mas o perfil ainda não está disponível.');
        const user = await response.json();
        const destinations = {
          CLIENTE: '/cliente',
          NUTRICIONISTA: '/nutricionista',
          RESTAURANTE: '/restaurante',
        };
        location.href = destinations[user.tipoPerfil] || '/';
      } catch (error) {
        showMessage(action, error instanceof Error ? error.message : 'Não foi possível entrar.');
      } finally {
        setBusy(action, false);
      }
    });
  }

  function setupAccount() {
    const inputs = document.querySelectorAll('.field-input');
    const [nome, sobrenome, email, password] = inputs;
    const terms = document.querySelector('.terms .checkbox');
    const action = document.querySelector('.btn-submit');
    const existing = draft();
    if (existing.nome) nome.value = existing.nome;
    if (existing.sobrenome) sobrenome.value = existing.sobrenome;
    if (existing.email) email.value = existing.email;
    password.addEventListener('input', () => {
      const score = [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(password.value)).length;
      document.querySelectorAll('.pw-bar').forEach((bar, index) => {
        bar.style.background = index < score ? '#5BB033' : '';
      });
      const labels = ['Muito fraca', 'Fraca', 'Regular', 'Boa', 'Excelente'];
      const strong = document.querySelector('.pw-hint strong');
      if (strong) strong.textContent = labels[score];
    });
    document.querySelector('.terms')?.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      terms?.classList.toggle('checked');
    });
    document.querySelectorAll('.btn-social').forEach((button) => {
      button.addEventListener('click', () => showMessage(action, 'Este provedor social ainda não está configurado.'));
    });
    action?.addEventListener('click', (event) => {
      event.preventDefault();
      clearMessage();
      try {
        requireFields([
          [nome, 'seu nome'],
          [sobrenome, 'seu sobrenome'],
          [email, 'seu email'],
          [password, 'uma senha'],
        ]);
        if (!validEmail(value(email))) throw new Error('Informe um email válido.');
        if (value(password).length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
        if (terms && !terms.classList.contains('checked')) throw new Error('Aceite os termos para continuar.');
        saveDraft({
          nome: value(nome),
          sobrenome: value(sobrenome),
          email: value(email).toLowerCase(),
          password: value(password),
        });
        location.href = '04-cadastro-perfil.html';
      } catch (error) {
        showMessage(action, error.message);
      }
    });
  }

  function setupProfileChoice() {
    const action = document.getElementById('nextBtn');
    const types = { cliente: 'CLIENTE', nutri: 'NUTRICIONISTA', rest: 'RESTAURANTE' };
    const targets = {
      CLIENTE: '05-cadastro-cliente.html',
      NUTRICIONISTA: '06-cadastro-nutricionista.html',
      RESTAURANTE: '07-cadastro-restaurante.html',
    };
    document.querySelectorAll('.profile-card').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.classList.contains('profile-nutri')
          ? 'nutri'
          : card.classList.contains('profile-rest')
            ? 'rest'
            : 'cliente';
        saveDraft({ tipoPerfil: types[key] });
      });
    });
    action?.addEventListener('click', (event) => {
      event.preventDefault();
      const tipo = draft().tipoPerfil || 'CLIENTE';
      saveDraft({ tipoPerfil: tipo });
      location.href = targets[tipo];
    });
  }

  function setupClient() {
    const fields = document.querySelectorAll('.field-input');
    const action = document.querySelector('.btn-next');
    const updateImc = () => {
      const weight = Number(fields[0]?.value);
      const height = Number(fields[1]?.value) / 100;
      const imc = weight > 0 && height > 0 ? weight / (height * height) : 0;
      const output = document.querySelector('.imc-val');
      if (output) {
        const classification = imc < 18.5 ? 'baixo peso' : imc < 25 ? 'peso normal' : imc < 30 ? 'sobrepeso' : 'obesidade';
        output.innerHTML = `${imc ? imc.toFixed(1) : '--'} <small>· ${classification}</small>`;
      }
    };
    fields[0]?.addEventListener('input', updateImc);
    fields[1]?.addEventListener('input', updateImc);
    action?.addEventListener('click', (event) => {
      event.preventDefault();
      const objective = document.querySelector('.objective-card.selected');
      const objectiveText = objective?.querySelector('.objective-title')?.textContent?.trim() || 'Equilíbrio';
      const kcal = Number(objective?.querySelector('.objective-kcal')?.textContent?.replace(/\D/g, '')) || 2000;
      const [peso, altura, idade] = fields;
      try {
        requireFields([[peso, 'seu peso'], [altura, 'sua altura'], [idade, 'sua idade']]);
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - Number(value(idade)));
        void finishRegistration(action, {
          dataNascimento: birthDate.toISOString().slice(0, 10),
          pesoKg: Number(value(peso)),
          alturaCm: Number(value(altura)),
          objetivoNutricional: objectiveText,
          restricoes: selectedLabels('.restriction-pill.selected'),
          metaCaloriasDiarias: kcal,
        });
      } catch (error) {
        showMessage(action, error.message);
      }
    });
  }

  function setupNutritionist() {
    const inputs = document.querySelectorAll('.field-input');
    const selects = document.querySelectorAll('.field-select');
    const textarea = document.querySelector('.field-textarea');
    const action = document.querySelector('.btn-next');
    const tagsHost = document.querySelector('.tags-input');
    const tagInput = tagsHost?.querySelector('input');
    const addTag = (label) => {
      const normalized = label.replace(/^\+\s*/, '').trim();
      if (!normalized || [...document.querySelectorAll('.tags-input .tag')].some((tag) => tag.textContent.trim().startsWith(normalized))) return;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `${normalized} ×`;
      tag.addEventListener('click', () => tag.remove());
      tagsHost?.insertBefore(tag, tagInput || null);
    };
    document.querySelectorAll('.tags-input .tag').forEach((tag) => tag.addEventListener('click', () => tag.remove()));
    document.querySelectorAll('.tag-suggestion').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        addTag(button.textContent);
      });
    });
    tagInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag(tagInput.value);
        tagInput.value = '';
      }
    });
    setupTextareaCounter(textarea);
    setupImagePicker('.photo-upload, .profile-photo, .photo-column');
    action?.addEventListener('click', (event) => {
      event.preventDefault();
      const [crn, start, end, slogan] = inputs;
      try {
        requireFields([[crn, 'seu CRN'], [textarea, 'sua apresentação profissional']]);
        void finishRegistration(action, {
          crn: value(crn).replace(/\/.*$/, ''),
          ufCrn: selectedText(selects[0]).match(/\(([A-Z]{2})/)?.[1] || 'PE',
          especialidades: selectedLabels('.tags-input .tag').map((item) =>
            item.replace(/×\s*$/, '').replace(/\s+/g, ' ').trim(),
          ),
          diasDisponiveis: selectedLabels('.day-toggle.selected'),
          horarioInicio: value(start) || '09:00',
          horarioFim: value(end) || '18:00',
          slogan: value(slogan),
          bio: value(textarea),
          telefone: '',
          valorConsulta: null,
          fotoUrl: null,
        });
      } catch (error) {
        showMessage(action, error.message);
      }
    });
  }

  function setupRestaurant() {
    const fields = document.querySelectorAll('.field-input');
    const select = document.querySelector('.field-select');
    const textarea = document.querySelector('.field-textarea');
    const action = document.querySelector('.btn-next');
    setupTextareaCounter(textarea);
    setupImagePicker('.logo-upload');
    const cnpjValidation = document.querySelector('.cnpj-validation');
    if (cnpjValidation) cnpjValidation.style.display = 'none';
    fields[2]?.addEventListener('input', () => {
      const digits = fields[2].value.replace(/\D/g, '');
      if (cnpjValidation) cnpjValidation.style.display = digits.length === 14 ? '' : 'none';
    });
    action?.addEventListener('click', (event) => {
      event.preventDefault();
      const [nome, razao, cnpj, telefone, cep, rua, bairro, numero, complemento, cidade] = fields;
      try {
        requireFields([
          [nome, 'o nome fantasia'], [razao, 'a razão social'], [cnpj, 'o CNPJ'],
          [telefone, 'o telefone'], [cep, 'o CEP'], [rua, 'o logradouro'],
          [bairro, 'o bairro'], [numero, 'o número'], [cidade, 'a cidade'],
          [textarea, 'a descrição do restaurante'],
        ]);
        const horarios = {};
        document.querySelectorAll('.hours-grid').forEach((row) => {
          const day = row.querySelector('.hours-day')?.textContent?.trim();
          const times = [...row.querySelectorAll('input[type="time"]')].map((item) => item.value);
          if (day) horarios[day] = { ativo: row.querySelector('.hours-toggle')?.classList.contains('on'), times };
        });
        const stateCodes = {
          Pernambuco: 'PE', 'São Paulo': 'SP', 'Rio de Janeiro': 'RJ',
          'Minas Gerais': 'MG', Bahia: 'BA', Ceará: 'CE',
        };
        void finishRegistration(action, {
          nomeFantasia: value(nome), razaoSocial: value(razao), cnpj: value(cnpj),
          telefone: value(telefone), cep: value(cep), logradouro: value(rua), numero: value(numero),
          complemento: value(complemento), bairro: value(bairro), cidade: value(cidade),
          estado: stateCodes[selectedText(select)] || selectedText(select).slice(0, 2).toUpperCase(),
          tiposCozinha: selectedLabels('.cuisine-pill.selected'),
          horarioFuncionamento: horarios,
          slogan: value(fields[fields.length - 1]),
          descricao: value(textarea),
          logoUrl: document.querySelector('.logo-upload img')?.src || null,
        });
      } catch (error) {
        showMessage(action, error.message);
      }
    });
  }

  function setupTextareaCounter(textarea) {
    const counter = textarea?.parentElement?.querySelector('.char-counter');
    if (!textarea || !counter) return;
    const update = () => {
      counter.textContent = `${textarea.value.length} / 500`;
      counter.style.color = textarea.value.length > 500 ? '#C7402E' : '';
    };
    textarea.addEventListener('input', update);
    update();
  }

  function setupImagePicker(selector) {
    const host = document.querySelector(selector);
    if (!host) return;
    host.style.cursor = 'pointer';
    host.addEventListener('click', () => {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/png,image/jpeg,image/webp';
      picker.addEventListener('change', () => {
        const file = picker.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          showMessage(document.querySelector('.btn-next'), 'A imagem deve ter no máximo 5 MB.');
          return;
        }
        const image = host.querySelector('img');
        if (image) image.src = URL.createObjectURL(file);
      });
      picker.click();
    });
  }

  const setups = {
    '02-login.html': setupLogin,
    '03-cadastro-etapa1.html': setupAccount,
    '04-cadastro-perfil.html': setupProfileChoice,
    '05-cadastro-cliente.html': setupClient,
    '06-cadastro-nutricionista.html': setupNutritionist,
    '07-cadastro-restaurante.html': setupRestaurant,
  };
  document.addEventListener('DOMContentLoaded', () => setups[page]?.());
})();
