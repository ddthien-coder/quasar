import { h, defineComponent } from 'vue'

import { stopAndPrevent } from '../../utils/event.js'
import { slot } from '../../utils/slot.js'

export default defineComponent({
  name: 'QForm',

  provide () {
    return {
      __qForm: this
    }
  },

  props: {
    autofocus: Boolean,
    noErrorFocus: Boolean,
    noResetFocus: Boolean,
    greedy: Boolean
  },

  emits: [ 'submit', 'reset', 'validation-success', 'validation-error' ],

  methods: {
    validate (shouldFocus) {
      const promises = []
      const focus = typeof shouldFocus === 'boolean'
        ? shouldFocus
        : this.noErrorFocus !== true

      this.validateIndex++

      const components = this.getValidationComponents()

      const emit = (res, ref) => {
        this.$emit('validation-' + (res === true ? 'success' : 'error'), ref)
      }

      for (let i = 0; i < components.length; i++) {
        const comp = components[i]
        const valid = comp.validate()

        if (typeof valid.then === 'function') {
          promises.push(
            valid.then(
              valid => ({ valid, comp }),
              error => ({ valid: false, comp, error })
            )
          )
        }
        else if (valid !== true) {
          if (this.greedy === false) {
            emit(false, comp)

            if (focus === true && typeof comp.focus === 'function') {
              comp.focus()
            }

            return Promise.resolve(false)
          }

          promises.push({ valid: false, comp })
        }
      }

      if (promises.length === 0) {
        emit(true)
        return Promise.resolve(true)
      }

      const index = this.validateIndex

      return Promise.all(promises).then(
        res => {
          if (index === this.validateIndex) {
            const errors = res.filter(r => r.valid !== true)

            if (errors.length === 0) {
              emit(true)
              return true
            }

            const { valid, comp } = errors[0]

            emit(false, comp)

            if (
              focus === true &&
              valid !== true &&
              typeof comp.focus === 'function'
            ) {
              comp.focus()
            }

            return false
          }
        }
      )
    },

    resetValidation () {
      this.validateIndex++

      this.getValidationComponents().forEach(comp => {
        comp.resetValidation()
      })
    },

    submit (evt) {
      evt !== void 0 && stopAndPrevent(evt)

      this.validate().then(val => {
        if (val === true) {
          if (this.$attrs.onSubmit !== void 0) {
            this.$emit('submit', evt)
          }
          else if (evt !== void 0 && evt.target !== void 0 && typeof evt.target.submit === 'function') {
            evt.target.submit()
          }
        }
      })
    },

    reset (evt) {
      evt !== void 0 && stopAndPrevent(evt)

      this.$emit('reset')

      this.$nextTick(() => { // allow userland to reset values before
        this.resetValidation()
        if (this.autofocus === true && this.noResetFocus !== true) {
          this.focus()
        }
      })
    },

    focus () {
      const target = this.$el.querySelector('[autofocus], [data-autofocus]') ||
        Array.prototype.find.call(this.$el.querySelectorAll('[tabindex]'), el => el.tabIndex > -1)

      target !== null && target !== void 0 && target.focus()
    },

    getValidationComponents () {
      return this.instances
    },

    bindComponent (instance) {
      this.instances.push(instance)
    },

    unbindComponent (instance) {
      const index = this.instances.indexOf(instance)
      if (index > -1) {
        this.instances.splice(index, 1)
      }
    }
  },

  render () {
    return h('form', {
      class: 'q-form',
      onSubmit: this.submit,
      onReset: this.reset
    }, slot(this, 'default'))
  },

  created () {
    this.instances = []
  },

  mounted () {
    this.validateIndex = 0
    this.autofocus === true && this.focus()
  }
})
